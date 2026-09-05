"""Utility scoring for RevenueOS."""
from typing import Dict, Any

# Action-specific cost parameters (in currency units, e.g., ₹)
ACTION_COSTS = {
    "no_action": {"cost": 0.0, "contacts": 0, "retries": 0, "delay_hours": 0},
    "immediate_retry": {"cost": 1.0, "contacts": 0, "retries": 1, "delay_hours": 0},
    "delayed_retry": {"cost": 1.0, "contacts": 0, "retries": 1, "delay_hours": 6},
    "payment_link": {"cost": 2.0, "contacts": 1, "retries": 0, "delay_hours": 2},
    "notification": {"cost": 0.5, "contacts": 1, "retries": 0, "delay_hours": 12},
    "human_escalation": {"cost": 50.0, "contacts": 2, "retries": 0, "delay_hours": 24},
}

def compute_utility(
    amount: float,
    p_recovery: float,
    action: str,
    action_cost: float = 0.0,
    expected_contacts: float = 0.0,
    expected_retries: float = 0.0,
    expected_delay_hours: float = 0.0,
    friction_per_contact: float = 2.0,
    retry_penalty_per_retry: float = 0.2,
    delay_penalty_per_hour: float = 0.05
) -> float:
    """
    Compute net utility for a recovery action.
    Utility = expected_recovered - action_cost - friction_cost - retry_cost - delay_cost
    """
    expected_recovered = amount * p_recovery
    friction_cost = friction_per_contact * expected_contacts
    retry_cost = retry_penalty_per_retry * expected_retries
    delay_cost = delay_penalty_per_hour * expected_delay_hours
    utility = expected_recovered - (action_cost + friction_cost + retry_cost + delay_cost)
    return utility