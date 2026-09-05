"""
Audit trail helper for RevenueOS.
Logs every important step in the recovery pipeline to the audit_events table.
"""

import json
import uuid
from datetime import datetime
from app.models import AuditEvent

def log_audit(db, event_type, entity_id, entity_type, actor, action_taken, details_dict):
    """
    Log an audit event.

    Args:
        db: SQLAlchemy session
        event_type: Type of event (e.g., 'revenue_event_detected', 'policy_check')
        entity_id: ID of the related entity (e.g., revenue_event.id)
        entity_type: Type of the entity (e.g., 'revenue_event')
        actor: Who performed the action (e.g., 'system', 'human', 'ai_agent')
        action_taken: Description of the action taken
        details_dict: Dictionary of details to be stored as JSON
    """
    audit_event = AuditEvent(
        id=str(uuid.uuid4()),
        event_type=event_type,
        entity_id=entity_id,
        entity_type=entity_type,
        actor=actor,
        action_taken=action_taken,
        details=json.dumps(details_dict)
    )
    db.add(audit_event)
    db.commit()