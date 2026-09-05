"""Strategy engine for RevenueOS."""
from typing import List, Dict, Any, Optional
from abc import ABC, abstractmethod
import logging
import pandas as pd
from sqlalchemy.orm import Session

from ..models import RevenueEvent, Payment, Customer, Merchant
from ..ml import action_recovery_model
from .scoring import compute_utility, ACTION_COSTS
from ..policy_engine import check_policy

logger = logging.getLogger(__name__)

def _event_to_dataframe(revenue_event: RevenueEvent, db: Session) -> pd.DataFrame:
    """Convert a RevenueEvent to a single-row DataFrame with the columns expected by the model.
    Joins with Payment, Customer, and Merchant to get actual context."""
    # Get the payment, customer, and merchant for this event
    payment = db.query(Payment).filter(Payment.id == revenue_event.payment_id).first()
    if not payment:
        # If payment not found, fall back to defaults (should not happen in normal operation)
        payment = Payment(
            id=revenue_event.payment_id,
            amount=revenue_event.amount_at_risk,
            currency="INR",
            payment_method="card",
            failure_reason="unknown",
            gateway="razorpay"
        )
    customer = None
    merchant = None
    if payment:
        customer = db.query(Customer).filter(Customer.id == payment.customer_id).first()
        if customer:
            merchant = db.query(Merchant).filter(Merchant.id == customer.merchant_id).first()

    # Extract features with fallbacks
    data = {
        'amount': [payment.amount if payment else revenue_event.amount_at_risk],
        'hour_of_day': [revenue_event.detected_at.hour],
        'day_of_week': [revenue_event.detected_at.weekday()],
        'is_weekend': [1 if revenue_event.detected_at.weekday() >= 5 else 0],
        'historical_success_rate': [customer.historical_success_rate if customer else 0.8],
        'avg_transaction_value': [customer.avg_transaction_value if customer else 0.0],
        'avg_ticket_size': [merchant.avg_ticket_size if merchant else 0.0],
        'payment_method': [payment.payment_method if payment else 'card'],
        'failure_reason': [payment.failure_reason if payment else 'unknown'],
        'failure_pattern': [customer.failure_pattern if customer else 'none'],
        'plan': [merchant.plan if merchant else 'starter']
    }
    df = pd.DataFrame(data)
    return df

class Strategy(ABC):
    @abstractmethod
    def select_action(self, revenue_event, db=None, attempted_actions: Optional[List[str]] = None, step_index: int = 0) -> Dict[str, Any]:
        pass

class FixedRetryBaseline(Strategy):
    def select_action(self, revenue_event, db=None, attempted_actions: Optional[List[str]] = None, step_index: int = 0) -> Dict[str, Any]:
        action = "immediate_retry"
        reason = "Fixed retry baseline"
        expected_recovery = revenue_event.amount_at_risk * 0.1  # placeholder
        utility = expected_recovery
        confidence = 0.1
        policy_check = {"approved": True, "reason": "within policy", "requires_human_approval": False}
        return {
            "action": action,
            "reason": reason,
            "expected_recovery": expected_recovery,
            "utility": utility,
            "confidence": confidence,
            "policy_check": policy_check
        }

class RevenueOSUtilityStrategy(Strategy):
    def select_action(self, revenue_event, db=None, attempted_actions: Optional[List[str]] = None, step_index: int = 0) -> Dict[str, Any]:
        if attempted_actions is None:
            attempted_actions = []
        context_df = _event_to_dataframe(revenue_event, db=db)
        probs_dict = action_recovery_model.predict_proba(context_df=context_df, action=None)
        all_actions = ["no_action", "immediate_retry", "delayed_retry", "payment_link", "notification", "human_escalation"]
        best_action = None
        best_utility = -float('inf')
        best_info = None
        for action in all_actions:
            if action in attempted_actions:
                continue
            p = probs_dict.get(action, 0.0)
            expected_recovery = float(revenue_event.amount_at_risk * p)
            # Get action costs from ACTION_COSTS
            action_info = ACTION_COSTS.get(action, {"cost": 0.0, "contacts": 0, "retries": 0, "delay_hours": 0})
            utility = float(compute_utility(
                amount=revenue_event.amount_at_risk,
                p_recovery=p,
                action=action,
                action_cost=action_info["cost"],
                expected_contacts=action_info["contacts"],
                expected_retries=action_info["retries"],
                expected_delay_hours=action_info["delay_hours"]
            ))
            policy_check = check_policy(revenue_event, action, db)
            if not policy_check.get('approved', False):
                continue
            if utility > best_utility:
                best_utility = utility
                best_action = action
                best_info = {
                    "action": action,
                    "reason": f"Selected based on highest utility: {utility:.2f}",
                    "expected_recovery": expected_recovery,
                    "utility": utility,
                    "confidence": p,
                    "policy_check": policy_check
                }
        if best_action is None:
            return {
                "action": "no_action",
                "reason": "No permitted actions available",
                "expected_recovery": 0.0,
                "utility": 0.0,
                "confidence": 0.0,
                "policy_check": {"approved": False, "reason": "no permitted actions", "requires_human_approval": False}
            }
        return best_info