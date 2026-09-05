"""
Policy engine for RevenueOS.
Checks if a proposed action is allowed by business policies.
"""

def check_policy(revenue_event, proposed_action, db=None):
    """
    Check if the proposed action is allowed by policy.
    Returns a dict with keys:
        - approved: bool
        - reason: str (if not approved)
        - requires_human_approval: bool
    """
    # Fetch the payment to check dispute and other fields
    from app.models import Payment
    payment = None
    if db:
        payment = db.query(Payment).filter(Payment.id == revenue_event.payment_id).first()

    # Policy rules from the master prompt:
    # - Amount > ₹10,000 → requires human approval (block in auto mode)
    # - Retries > 3 → block IMMEDIATE_RETRY and DELAYED_RETRY
    # - Contacts > 3 → block NOTIFICATION and PAYMENT_LINK
    # - payment.disputed == True → block all actions
    # - customer opted out → block NOTIFICATION
    # - HUMAN_ESCALATION → always requires human approval
    # - All others under ₹10,000 → auto approve

    amount = revenue_event.amount_at_risk
    action = proposed_action

    # Check if payment is disputed
    if payment and payment.disputed:
        return {
            "approved": False,
            "reason": "Payment is disputed, all recovery actions blocked.",
            "requires_human_approval": False
        }

    # Human escalation always requires human approval
    if action == "human_escalation":
        return {
            "approved": True,  # We allow the action to be selected but note it requires human approval
            "reason": "Human escalation always requires human approval.",
            "requires_human_approval": True
        }

    # Check amount limits
    if amount > 10000.0:
        # Requires human approval, block in auto mode
        return {
            "approved": False,
            "reason": f"Amount ₹{amount:,.2f} exceeds automatic recovery limit of ₹10,000.00. Human approval required.",
            "requires_human_approval": True
        }

    # If we have a db session, we can check retry and contact limits
    if db:
        from app.models import RecoveryAction, RecoveryDecision
        # Count previous recovery actions for this revenue_event
        # We need to get the recovery_decisions for this revenue_event, then the recovery_actions for those decisions.
        # Let's do a join: revenue_event -> recovery_decision -> recovery_action
        # We'll count the number of recovery_actions for this revenue_event by action type?
        # Actually, the policy says:
        #   Retries > 3 → block IMMEDIATE_RETRY and DELAYED_RETRY
        #   Contacts > 3 → block NOTIFICATION and PAYMENT_LINK
        # So we need to count the number of times we have attempted each type of action (or grouped by retry vs contact).
        # For simplicity, we'll assume:
        #   IMMEDIATE_RETRY and DELAYED_RETRY are both retries -> count them together as "retry"
        #   NOTIFICATION and PAYMENT_LINK are both contacts -> count them together as "contact"
        #   HUMAN_ESCALATION and NO_ACTION are neither.

        # We'll get all recovery_actions for this revenue_event via recovery_decisions.
        # We'll count:
        #   retry_count = number of actions in [IMMEDIATE_RETRY, DELAYED_RETRY]
        #   contact_count = number of actions in [NOTIFICATION, PAYMENT_LINK]

        # Query:
        #   SELECT COUNT(*) FROM recovery_action
        #   JOIN recovery_decision ON recovery_action.recovery_decision_id = recovery_decision.id
        #   WHERE recovery_decision.revenue_event_id = :revenue_event_id
        #   AND recovery_action.action_type IN (:retry_actions)
        #
        # We'll do two queries: one for retry, one for contact.

        retry_actions = ["immediate_retry", "delayed_retry"]
        contact_actions = ["payment_link", "notification"]

        # Count retries
        retry_count = 0
        if db:
            retry_count = db.query(RecoveryAction).join(RecoveryDecision).filter(
                RecoveryDecision.revenue_event_id == revenue_event.id,
                RecoveryAction.action_type.in_(retry_actions)
            ).count()

        # Count contacts
        contact_count = 0
        if db:
            contact_count = db.query(RecoveryAction).join(RecoveryDecision).filter(
                RecoveryDecision.revenue_event_id == revenue_event.id,
                RecoveryAction.action_type.in_(contact_actions)
            ).count()

        # Check retry limits
        if action in retry_actions and retry_count >= 3:
            return {
                "approved": False,
                "reason": f"Retry limit exceeded (attempted {retry_count} retries). No more retries allowed.",
                "requires_human_approval": False
            }

        # Check contact limits
        if action in contact_actions and contact_count >= 3:
            return {
                "approved": False,
                "reason": f"Contact limit exceeded (attempted {contact_count} contacts). No more contacts allowed.",
                "requires_human_approval": False
            }

    # If we reach here, the action is approved under policy (for amount <= 10,000 and not disputed, etc.)
    return {
        "approved": True,
        "reason": "Action within policy limits.",
        "requires_human_approval": False
    }