"""
Execution layer for RevenueOS.
Executes recovery actions via the counterfactual simulator, with real Razorpay integration for payment_link.
"""

import uuid
from datetime import datetime
import logging
from app.experimentation.simulator import get_simulator
from app.integrations.razorpay.client import get_razorpay_client

def execute_action(revenue_event, action_type, db=None, action_id=None):
    """
    Execute the specified action for the revenue event using the counterfactual simulator.
    For payment_link, attempts to create a real Razorpay payment link; falls back to simulator on error.
    The simulator provides deterministic outcomes based on ground truth data.

    Args:
        revenue_event: The revenue event object
        action_type: The type of action to execute (e.g., 'payment_link', 'notification')
        db: Database session (unused in simulator but kept for interface compatibility)
        action_id: Optional action ID for idempotency (if not provided, a new UUID is generated)

    Returns:
        Dict containing action execution results
    """
    if action_id is None:
        action_id = str(uuid.uuid4())

    executed_at = datetime.utcnow()

    if action_type == "payment_link":
        # Attempt to create a real Razorpay payment link
        try:
            client = get_razorpay_client()
            amount_in_paise = int(float(revenue_event.amount_at_risk) * 100)
            payment_link_data = {
                "amount": amount_in_paise,
                "currency": "INR",
                "description": "Payment recovery",
                "reference_id": action_id
            }
            payment_link = client.payment_link.create(payment_link_data)
            # Razorpay response includes 'short_url' and 'id'
            result_data = {
                "method": action_type,
                "executed_at": executed_at.isoformat(),
                "action_id": action_id,
                "payment_link_url": payment_link.get("short_url"),
                "razorpay_payment_link_id": payment_link.get("id"),
                "razorpay_response": payment_link
            }
            # For payment_link, we consider it successful if we got a response (Razorpay doesn't guarantee payment)
            # We'll set success based on simulator? Actually, we cannot know if customer will pay.
            # For demo, we treat as success if link created; actual recovery will be determined later via verification (simulator).
            # We'll still use simulator to determine if the payment would succeed (based on ground truth).
            simulator = get_simulator()
            outcome = simulator.simulate(
                event_id=revenue_event.payment_id,
                action=action_type,
                action_id=action_id
            )
            success = outcome["success"]
            actual_recovered = outcome["recovered_amount"]
            # Update result_data with simulator outcome for consistency
            result_data["simulator_outcome"] = outcome
            return {
                "action_id": action_id,
                "action_type": action_type,
                "executed_at": executed_at.isoformat(),
                "success": success,
                "result_data": result_data,
                "actual_recovered": actual_recovered
            }
        except Exception as e:
            logging.warning(f"Failed to create Razorpay payment link: {e}. Falling back to simulator.")
            # Fall through to simulator handling below

    # For all other actions (including payment_link on fallback), use the counterfactual simulator
    simulator = get_simulator()
    outcome = simulator.simulate(
        event_id=revenue_event.payment_id,  # ground truth is keyed by payment_id (event_id)
        action=action_type,
        action_id=action_id
    )

    # Map simulator output to expected return format
    result_data = {
        "method": action_type,
        "executed_at": executed_at.isoformat(),
        "action_id": action_id,
        "simulator_outcome": outcome
    }

    return {
        "action_id": action_id,
        "action_type": action_type,
        "executed_at": executed_at.isoformat(),
        "success": outcome["success"],
        "result_data": result_data,
        "actual_recovered": outcome["recovered_amount"]
    }