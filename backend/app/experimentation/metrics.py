"""
Metrics computation for RevenueOS experiment.
"""

from typing import List, Dict, Any

def compute_metrics(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Compute experiment metrics from a list of results.

    Each result is expected to be a dict with keys:
        - recovered: float (amount actually recovered)
        - amount_at_risk: float (amount at risk for the event)
        - attempts: int (number of attempts made)
        - contacts: int (number of contacts made)
        - cost: float (cost incurred)
        - (optional) other fields

    Returns a dict with:
        - total_recovered: sum of recovered amounts
        - total_at_risk: sum of amounts at risk
        - recovery_rate: total_recovered / total_at_risk
        - total_attempts: sum of attempts
        - total_contacts: sum of contacts
        - total_cost: sum of costs
        - events_processed: number of events
    """
    total_recovered = sum(r.get("recovered", 0.0) for r in results)
    total_at_risk = sum(r.get("amount_at_risk", 0.0) for r in results)
    recovery_rate = total_recovered / total_at_risk if total_at_risk > 0 else 0.0
    total_attempts = sum(r.get("attempts", 0) for r in results)
    total_contacts = sum(r.get("contacts", 0) for r in results)
    total_cost = sum(r.get("cost", 0.0) for r in results)
    events_processed = len(results)

    return {
        "total_recovered": total_recovered,
        "total_at_risk": total_at_risk,
        "recovery_rate": recovery_rate,
        "total_attempts": total_attempts,
        "total_contacts": total_contacts,
        "total_cost": total_cost,
        "events_processed": events_processed
    }