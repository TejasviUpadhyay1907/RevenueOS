"""
Recoverability model for RevenueOS.
Uses an action-aware trained model to estimate recovery probability.
"""

import logging
import os
import joblib
import json
import numpy as np
import pandas as pd
from datetime import datetime

_log = logging.getLogger(__name__)

ACTIONS = ["no_action", "immediate_retry", "delayed_retry", "payment_link", "notification", "human_escalation"]

# Get the directory of this file
_CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(_CURRENT_DIR, 'ml', 'action_recovery_model.joblib')
FEATURES_PATH = os.path.join(_CURRENT_DIR, 'ml', 'action_recovery_features.json')

try:
    model = joblib.load(MODEL_PATH)
    with open(FEATURES_PATH, 'r') as f:
        feature_names = json.load(f)
    model_loaded = True
except Exception as e:
    _log.warning("Could not load trained model: %s", e)
    model = None
    feature_names = None
    model_loaded = False

def _extract_features(revenue_event, payment, customer, merchant, action):
    """
    Build a one-row DataFrame matching the 12 columns the trained Pipeline expects.
    The Pipeline's ColumnTransformer handles all encoding internally.
    """
    attempted_at = getattr(payment, 'attempted_at', None) or revenue_event.detected_at or datetime.utcnow()

    row = {
        "amount": float(getattr(payment, 'amount', revenue_event.amount_at_risk) or 0),
        "hour_of_day": float(attempted_at.hour),
        "day_of_week": float(attempted_at.weekday()),
        "is_weekend": 1.0 if attempted_at.weekday() >= 5 else 0.0,
        "historical_success_rate": float(getattr(customer, 'historical_success_rate', 0.5) or 0.5),
        "avg_transaction_value": float(getattr(customer, 'avg_transaction_value', 1000.0) or 1000.0),
        "avg_ticket_size": float(getattr(merchant, 'avg_ticket_size', 2000.0) or 2000.0),
        "payment_method": str(getattr(payment, 'payment_method', 'card') or 'card'),
        "failure_reason": str(getattr(revenue_event, 'root_cause', 'unknown') or 'unknown'),
        "failure_pattern": str(getattr(customer, 'failure_pattern', 'none') or 'none'),
        "plan": str(getattr(merchant, 'plan', 'starter') or 'starter'),
        "action": str(action),
    }
    return pd.DataFrame([row])

def estimate_recovery_probability(revenue_event, action=None, db=None):
    """
    Estimate the probability of recovering the revenue event for a given action.
    If action is None, returns the maximum probability over all actions.
    If the model is loaded, use it; otherwise, fall back to heuristic.
    """
    if action is None:
        # Return the maximum probability over all actions
        max_prob = 0.0
        for act in ACTIONS:
            p = estimate_recovery_probability(revenue_event, act, db)
            if p > max_prob:
                max_prob = p
        return max_prob

    if not model_loaded or model is None or feature_names is None:
        # Fall back to heuristic
        return _heuristic_probability(revenue_event, action)

    try:
        # Import models inside the function to avoid circular imports
        from app.models import Payment, Customer, Merchant

        # Fetch related data from DB
        payment_obj = db.query(Payment).filter(Payment.id == revenue_event.payment_id).first()
        if not payment_obj:
            return _heuristic_probability(revenue_event, action)
        customer_obj = db.query(Customer).filter(Customer.id == payment_obj.customer_id).first()
        merchant_obj = db.query(Merchant).filter(Merchant.id == payment_obj.merchant_id).first()

        # Extract features and predict
        feature_df = _extract_features(revenue_event, payment_obj, customer_obj, merchant_obj, action)
        prob = model.predict_proba(feature_df)[0, 1]
        return float(prob)
    except Exception as e:
        # If anything goes wrong, fall back to heuristic (log once at debug level)
        _log.debug("Model prediction fell back to heuristic: %s", e)
        return _heuristic_probability(revenue_event, action)

def _heuristic_probability(revenue_event, action):
    """Simple heuristic to estimate recovery probability."""
    base_prob = 0.1  # Base 10% recovery probability
    
    # Adjust based on failure reason
    failure_reason = revenue_event.root_cause or 'unknown'
    if failure_reason == 'insufficient_funds':
        base_prob = 0.25  # Higher chance they'll add funds
    elif failure_reason == 'expired_card':
        base_prob = 0.05  # Low unless they update card
    elif failure_reason == 'issuer_decline':
        base_prob = 0.15
    elif failure_reason == 'technical_error':
        base_prob = 0.35  # Often transient
    elif failure_reason == 'gateway_timeout':
        base_prob = 0.40
    elif failure_reason == 'otp_limit_exceeded':
        base_prob = 0.10
    else:
        base_prob = 0.08
    
    # Adjust based on amount (lower amounts might be easier to recover?)
    # Actually, higher amounts might have more customer motivation to fix
    amount_factor = min(revenue_event.amount_at_risk / 10000, 1.0)  # Normalize to 0-1
    amount_adjustment = 0.5 + (amount_factor * 0.5)  # Between 0.5 and 1.0
    base_prob *= amount_adjustment
    
    # Cap at 0.95
    return min(base_prob, 0.95)