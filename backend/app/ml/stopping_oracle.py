"""
Stopping Oracle for RevenueOS recovery cascades.
Determines when to stop attempting recovery actions based on heuristics.
"""

from typing import List, Dict, Any


class StoppingOracle:
    """
    A stopping oracle that determines when to halt recovery attempts
    based on deterministic heuristics.
    """

    def should_stop(self, event, attempted_actions: List[str], db_session) -> Dict[str, Any]:
        """
        Determine whether to stop the recovery cascade.

        Args:
            event: The revenue event being processed
            attempted_actions: List of actions already attempted
            db_session: Database session (not used in heuristic but kept for interface)

        Returns:
            dict: {
                "stop": True/False,
                "reason": string,
                "p_recovery_remaining": float,
                "churn_risk": float,
                "recommendation": "write_off" | "human_escalation" | "continue"
            }
        """
        # Rule 1: Max attempts reached
        if len(attempted_actions) >= 3:
            return {
                "stop": True,
                "reason": "Max attempts reached",
                "p_recovery_remaining": max(0, 0.4 - len(attempted_actions) * 0.12),
                "churn_risk": min(1.0, len(attempted_actions) * 0.15),
                "recommendation": "write_off"
            }

        # Rule 2: Low value, not worth further cost
        if event.amount_at_risk < 500 and len(attempted_actions) >= 1:
            return {
                "stop": True,
                "reason": "Low value, not worth further cost",
                "p_recovery_remaining": max(0, 0.4 - len(attempted_actions) * 0.12),
                "churn_risk": min(1.0, len(attempted_actions) * 0.15),
                "recommendation": "write_off"
            }

        # Rule 3: Already escalated
        if "human_escalation" in attempted_actions:
            return {
                "stop": True,
                "reason": "Already escalated",
                "p_recovery_remaining": max(0, 0.4 - len(attempted_actions) * 0.12),
                "churn_risk": min(1.0, len(attempted_actions) * 0.15),
                "recommendation": "write_off"
            }

        # Calculate estimates
        p_recovery_remaining = max(0, 0.4 - len(attempted_actions) * 0.12)
        churn_risk = min(1.0, len(attempted_actions) * 0.15)

        # Determine recommendation based on p_recovery_remaining and amount
        if p_recovery_remaining < 0.1:
            recommendation = "write_off"
        elif event.amount_at_risk > 10000:
            recommendation = "human_escalation"
        else:
            recommendation = "continue"

        # Override recommendation if we're stopping for other reasons
        stop = False
        reason = ""
        if len(attempted_actions) >= 3:
            stop = True
            reason = "Max attempts reached"
        elif event.amount_at_risk < 500 and len(attempted_actions) >= 1:
            stop = True
            reason = "Low value, not worth further cost"
        elif "human_escalation" in attempted_actions:
            stop = True
            reason = "Already escalated"

        # If stopping and recommendation is continue, change to write_off
        if stop and recommendation == "continue":
            recommendation = "write_off"

        return {
            "stop": stop,
            "reason": reason,
            "p_recovery_remaining": p_recovery_remaining,
            "churn_risk": churn_risk,
            "recommendation": recommendation
        }