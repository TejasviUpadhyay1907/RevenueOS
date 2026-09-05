"""
Database models for RevenueOS.
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import enum

Base = declarative_base()

class Merchant(Base):
    __tablename__ = "merchants"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)
    plan = Column(String)  # starter, growth, enterprise
    avg_ticket_size = Column(Float)

class Customer(Base):
    __tablename__ = "customers"

    id = Column(String, primary_key=True, index=True)
    merchant_id = Column(String, ForeignKey("merchants.id"))
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)
    historical_success_rate = Column(Float)
    avg_transaction_value = Column(Float)
    failure_pattern = Column(String)  # none, insufficient_funds, expired_card, issuer_decline, technical

class Payment(Base):
    __tablename__ = "payments"

    id = Column(String, primary_key=True, index=True)
    merchant_id = Column(String, ForeignKey("merchants.id"))
    customer_id = Column(String, ForeignKey("customers.id"))
    amount = Column(Float, nullable=False)
    currency = Column(String, default="INR")
    attempted_at = Column(DateTime(timezone=True))
    payment_method = Column(String)
    gateway = Column(String, default="razorpay")
    order_id = Column(String)
    payment_id = Column(String, nullable=True)
    success = Column(Boolean, default=False)
    failure_reason = Column(String, nullable=True)
    failure_code = Column(Integer, nullable=True)
    auth_id = Column(String, nullable=True)
    settled_at = Column(DateTime(timezone=True), nullable=True)
    refunded = Column(Boolean, default=False)
    disputed = Column(Boolean, default=False)
    payment_metadata = Column(Text)  # JSON string

class RevenueEvent(Base):
    __tablename__ = "revenue_events"

    id = Column(String, primary_key=True, index=True)
    payment_id = Column(String, ForeignKey("payments.id"))
    amount_at_risk = Column(Float, nullable=False)
    detected_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String, default="AT_RISK")  # AT_RISK, ANALYZING, OPPORTUNITY_CREATED, ACTION_PROPOSED, POLICY_CHECK, APPROVED, BLOCKED, EXECUTING, VERIFYING, RECOVERED, FAILED, EXPIRED, STOPPED
    root_cause = Column(String, nullable=True)
    recovery_probability = Column(Float, nullable=True)
    expected_recovery = Column(Float, nullable=True)
    confidence = Column(String, nullable=True)  # Low, Medium, High

class RecoveryOpportunity(Base):
    __tablename__ = "recovery_opportunities"

    id = Column(String, primary_key=True, index=True)
    revenue_event_id = Column(String, ForeignKey("revenue_events.id"))
    expected_value = Column(Float, nullable=False)
    rank = Column(Integer, nullable=False)
    intervention_suggested = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class RecoveryDecision(Base):
    __tablename__ = "recovery_decisions"

    id = Column(String, primary_key=True, index=True)
    revenue_event_id = Column(String, ForeignKey("revenue_events.id"))
    action = Column(String, nullable=False)
    reason = Column(Text)
    confidence = Column(Float)
    expected_recovery = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class RecoveryAction(Base):
    __tablename__ = "recovery_actions"

    id = Column(String, primary_key=True, index=True)
    recovery_decision_id = Column(String, ForeignKey("recovery_decisions.id"))
    action_type = Column(String, nullable=False)  # smart_retry, payment_link, notification, etc.
    parameters = Column(Text)  # JSON string
    executed_at = Column(DateTime(timezone=True))
    status = Column(String, default="PENDING")  # PENDING, EXECUTING, SUCCESS, FAILED, TIMEOUT, UNKNOWN
    result_data = Column(Text)  # JSON string
    actual_recovered = Column(Float, default=0.0)

class Policy(Base):
    __tablename__ = "policies"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    description = Column(Text)
    amount_limit = Column(Float)  # maximum amount for automatic recovery
    max_retries = Column(Integer)
    max_contacts = Column(Integer)
    require_approval_above = Column(Float)  # amount requiring human approval
    stop_on_dispute = Column(Boolean, default=True)
    stop_on_opt_out = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    event_type = Column(String, nullable=False)  # revenue_event_detected, root_cause_identified, etc.
    entity_id = Column(String)  # ID of the related entity (revenue_event, decision, action, etc.)
    entity_type = Column(String)  # revenue_event, recovery_decision, recovery_action, etc.
    actor = Column(String)  # system, human, ai_agent
    action_taken = Column(String)
    details = Column(Text)  # JSON string