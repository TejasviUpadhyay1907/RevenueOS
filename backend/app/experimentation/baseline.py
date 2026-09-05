"""
FixedRetryBaseline strategy for RevenueOS experiment.
Always retries up to max_retries times with immediate retry, then gives up.
"""

from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

class FixedRetryBaseline:
    """Baseline strategy that uses fixed retries (no intelligence)."""

    def __init__(self, max_retries: int = 3):
        self.max_retries = max_retries

    def select_action(self, event, db: Session = None, retry_count: int = 0, step_index: int = 0) -> Dict[str, Any]:
        """
        Select an action based on fixed retry logic.

        Args:
            event: The revenue event
            db: Database session (unused in this baseline)
            retry_count: Number of previous retry attempts for this event
            step_index: Current step in the cascade (unused)

        Returns:
            Dict with action decision
        """
        if retry_count < self.max_retries:
            return {
                "action": "immediate_retry",
                "reason": f"Fixed retry baseline: attempt {retry_count + 1} of {self.max_retries}",
                "expected_recovery": event.amount_at_risk * 0.1,  # placeholder
                "utility": event.amount_at_risk * 0.1,  # placeholder
                "confidence": 0.1,
                "policy_check": {"approved": True, "reason": "within policy", "requires_human_approval": False}
            }
        else:
            return {
                "action": "no_action",
                "reason": f"Fixed retry baseline: max retries ({self.max_retries}) exceeded",
                "expected_recovery": 0.0,
                "utility": 0.0,
                "confidence": 0.0,
                "policy_check": {"approved": True, "reason": "within policy", "requires_human_approval": False}
            }