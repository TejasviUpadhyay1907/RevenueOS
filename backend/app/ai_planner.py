"""AI planner for RevenueOS with cascading recovery."""
from typing import List, Dict, Any
from .models import RevenueEvent
from .ml import action_recovery_model
from .ml.stopping_oracle import StoppingOracle
from .decision.strategy_engine import RevenueOSUtilityStrategy, FixedRetryBaseline
from .policy_engine import check_policy
from .execution_layer import execute_action
from .verification_layer import verify_outcome
from . import db
import uuid

def plan_recovery(revenue_event, db_session=None, max_steps: int = 3) -> List[Dict[str, Any]]:
    """
    Plan a cascade of recovery actions for a revenue event.
    Returns a list of step dicts, each representing one step in the cascade.
    """
    if db_session is None:
        db_session = db.SessionLocal()
    try:
        attempted_actions: List[str] = []
        steps: List[Dict[str, Any]] = []
        strategy = RevenueOSUtilityStrategy()
        stopping_oracle = StoppingOracle()
        for step_index in range(max_steps):
            # Select action
            decision = strategy.select_action(revenue_event, db=db_session, attempted_actions=attempted_actions, step_index=step_index)
            action = decision["action"]
            if action == "no_action":
                # No further action possible
                break
            # Policy check (already done in strategy, but double-check)
            policy_check = check_policy(revenue_event, action, db=db_session)
            if not policy_check.get("approved", False):
                # Action not permitted; stop cascade
                steps.append({
                    "step_index": step_index,
                    "action": action,
                    "decision": decision,
                    "policy_check": policy_check,
                    "executed": False,
                    "verification": None,
                    "stop_reason": "policy_block"
                })
                break
            # Execute action
            action_id = str(uuid.uuid4())
            execution_result = execute_action(revenue_event, action, db_session, action_id=action_id)
            # Verify outcome
            verification_result = verify_outcome(revenue_event, execution_result, db=db_session)
            # Record step
            step_record = {
                "step_index": step_index,
                "action": action,
                "decision": decision,
                "policy_check": policy_check,
                "execution_result": execution_result,
                "verification_result": verification_result,
                "action_id": action_id,
                "stop_reason": None
            }
            steps.append(step_record)
            attempted_actions.append(action)
            # Check if recovered
            if verification_result.get("success", False) and verification_result.get("actual_recovered", 0.0) > 0:
                # Success: stop cascade
                step_record["stop_reason"] = "success"
                break
            # Check stopping oracle after each failed attempt
            oracle_result = stopping_oracle.should_stop(revenue_event, attempted_actions, db_session)
            if oracle_result["stop"]:
                step_record["stop_reason"] = oracle_result["reason"]
                step_record["oracle_result"] = oracle_result
                break
            # If not success and not stopping, continue loop
        return steps
    finally:
        db_session.close()


def suggest_intervention(revenue_event, db_session=None) -> Dict[str, Any]:
    """
    Suggest a single intervention for a revenue event.
    Returns a DecisionResponse-compatible dict:
    {event_id, action, reason, confidence, expected_recovery}
    """
    if db_session is None:
        db_session = db.SessionLocal()
    try:
        strategy = RevenueOSUtilityStrategy()
        result = strategy.select_action(revenue_event, db=db_session)
        return {
            "event_id": revenue_event.id,
            "action": str(result["action"]),
            "reason": str(result.get("reason", "")),
            "confidence": float(result.get("confidence", 0.0)),
            "expected_recovery": float(result.get("expected_recovery", 0.0)),
            "policy_check": result.get("policy_check"),
        }
    finally:
        db_session.close()
