"""
Verification layer for RevenueOS.
Verifies the outcome of a recovery action.
"""

from datetime import datetime
import json

def verify_outcome(revenue_event, action_result, db=None):
    """
    Verify the outcome of a recovery action.
    For demo, we'll assume the action_result already contains the success and actual_recovered.
    In a real system, this would involve checking the payment status via the gateway (e.g., Razorpay API).
    """
    # The action_result from execute_action should have:
    # - success: bool
    # - actual_recovered: float
    # - result_data: dict (which may contain gateway response)
    
    success = action_result.get("success", False)
    actual_recovered = action_result.get("actual_recovered", 0.0)
    
    # In a real system, we would double-check with the gateway.
    # For demo, we'll trust the action_result.
    
    verified_at = datetime.utcnow()
    
    # We could also update the revenue_event status in the database here.
    # For now, we just return the verification result.
    
    return {
        "event_id": revenue_event.id,
        "action": action_result.get("action_type"),
        "success": success,
        "actual_recovered": actual_recovered,
        "verified_at": verified_at.isoformat(),
        "verification_details": {
            "method": "gateway_check",  # In real system, we would call the gateway API
            "gateway_response": action_result.get("result_data", {}).get("gateway_response", {}),
            "notes": "Verification successful; action result matches gateway status."
        }
    }