"""
Pydantic schemas for RevenueOS API.
"""

from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class RevenueEventResponse(BaseModel):
    id: str
    payment_id: str
    amount_at_risk: float
    detected_at: datetime
    status: str
    root_cause: Optional[str] = None
    recovery_probability: Optional[float] = None
    expected_recovery: Optional[float] = None
    confidence: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class OpportunityResponse(BaseModel):
    revenue_event_id: str
    amount_at_risk: float
    recovery_probability: float
    expected_value: float
    rank: int

    model_config = ConfigDict(from_attributes=True)

class DecisionResponse(BaseModel):
    event_id: str
    action: str
    reason: str
    confidence: float
    expected_recovery: float
    llm_explanation: Optional[str] = None
    shap_explanation: Optional[list] = None

    model_config = ConfigDict(from_attributes=True)

class ActionResponse(BaseModel):
    event_id: str
    action: str
    policy_check: dict
    execution: dict
    verification: dict

    model_config = ConfigDict(from_attributes=True)

class VerificationResponse(BaseModel):
    event_id: str
    action: str
    success: bool
    actual_recovered: float
    verified_at: datetime

    model_config = ConfigDict(from_attributes=True)