"""
RevenueOS API v1.
"""

import glob
import json
import os
import threading
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import RevenueEvent, Payment, Customer, Merchant, RecoveryAction
from app.schemas import (
    RevenueEventResponse,
    OpportunityResponse,
    DecisionResponse,
    ActionResponse,
)
from app.recoverability_model import estimate_recovery_probability
from app.opportunity_engine import calculate_expected_value
from app.ai_planner import suggest_intervention
from app.policy_engine import check_policy
from app.execution_layer import execute_action
from app.verification_layer import verify_outcome
from app.agents.root_cause_agent import explain_failure
from app.ml.action_recovery_model import explain_prediction
from app.agents.failure_dna import FailureDNA
from app.agents.orchestrator import RecoveryOrchestrator

router = APIRouter()


# ── Revenue Events ────────────────────────────────────────────────────────────

@router.get("/revenue-events", response_model=List[RevenueEventResponse])
def get_revenue_events(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List revenue events (failed payments) that are AT_RISK."""
    events = (
        db.query(RevenueEvent)
        .filter(RevenueEvent.status == "AT_RISK")
        .offset(skip)
        .limit(limit)
        .all()
    )
    return events


@router.get("/revenue-events/{event_id}", response_model=RevenueEventResponse)
def get_revenue_event(event_id: str, db: Session = Depends(get_db)):
    """Fetch a single revenue event by ID."""
    event = db.query(RevenueEvent).filter(RevenueEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Revenue event not found")
    return event


# ── Opportunities ─────────────────────────────────────────────────────────────

@router.get("/opportunities", response_model=List[OpportunityResponse])
def get_opportunities(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Return ranked recovery opportunities with ML-estimated probabilities."""
    # Cap at 500 events max to keep response time reasonable
    fetch_limit = min(skip + limit, 500)
    events = (
        db.query(RevenueEvent)
        .filter(RevenueEvent.status == "AT_RISK")
        .limit(fetch_limit)
        .all()
    )

    opportunities = []
    for event in events:
        try:
            prob = estimate_recovery_probability(event, action=None, db=db)
        except Exception:
            prob = 0.0
        expected_value = calculate_expected_value(event.amount_at_risk, prob, 0.8)
        opportunities.append(
            {
                "revenue_event_id": event.id,
                "amount_at_risk": event.amount_at_risk,
                "recovery_probability": prob,
                "expected_value": expected_value,
                "rank": 0,
            }
        )

    opportunities.sort(key=lambda x: x["expected_value"], reverse=True)
    for i, opp in enumerate(opportunities):
        opp["rank"] = i + 1

    return opportunities[skip : skip + limit]


@router.get("/opportunities/{event_id}/decision", response_model=DecisionResponse)
def get_decision(event_id: str, db: Session = Depends(get_db)):
    """Get the AI planner's recommended action for a specific event."""
    event = db.query(RevenueEvent).filter(RevenueEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Revenue event not found")
    decision = suggest_intervention(event, db)

    # Fetch related records for explanation
    payment = db.query(Payment).filter(Payment.id == event.payment_id).first()
    customer = db.query(Customer).filter(Customer.id == payment.customer_id).first() if payment else None
    merchant = db.query(Merchant).filter(Merchant.id == payment.merchant_id).first() if payment else None

    # Get LLM explanation if we have the necessary records
    if payment and customer and merchant:
        explanation = explain_failure(event, payment, customer, merchant)
        decision["llm_explanation"] = explanation
    else:
        decision["llm_explanation"] = None

    # Get SHAP explanation for the recommended action
    if payment and customer and merchant:
        # Create a feature dataframe with the context for this event
        import pandas as pd
        feature_data = {
            'amount': [event.amount_at_risk],
            'hour_of_day': [event.detected_at.hour],
            'day_of_week': [event.detected_at.weekday()],
            'is_weekend': [1 if event.detected_at.weekday() >= 5 else 0],
            'historical_success_rate': [float(getattr(customer, 'historical_success_rate', 0.5) or 0.5)],
            'avg_transaction_value': [float(getattr(customer, 'avg_transaction_value', 1000) or 1000)],
            'avg_ticket_size': [float(getattr(merchant, 'avg_ticket_size', 2000) or 2000)],
            'payment_method': [payment.payment_method],
            'failure_reason': [event.root_cause or 'unknown'],
            'failure_pattern': [getattr(customer, 'failure_pattern', 'none')],
            'plan': [merchant.plan],
            'action': [decision["action"]]  # Include the recommended action
        }
        feature_df = pd.DataFrame(feature_data)

        # Get SHAP explanation
        shap_explanation = explain_prediction(feature_df, decision["action"])
        decision["shap_explanation"] = shap_explanation
    else:
        decision["shap_explanation"] = None

    return decision


@router.post("/opportunities/{event_id}/execute", response_model=ActionResponse)
async def execute_opportunity(event_id: str, db: Session = Depends(get_db)):
    """Execute the suggested intervention for a revenue event."""
    event = db.query(RevenueEvent).filter(RevenueEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Revenue event not found")

    decision = suggest_intervention(event, db)
    policy_result = check_policy(event, decision["action"], db)
    if not policy_result["approved"]:
        raise HTTPException(
            status_code=403,
            detail=f"Action blocked by policy: {policy_result['reason']}",
        )

    action_result = execute_action(event, decision["action"], db)
    verification_result = verify_outcome(event, action_result, db)

    # Broadcast WebSocket event if payment was recovered — do it in a background thread
    # to avoid circular import (revenue.py can't import from main.py)
    if verification_result.get("success", False) and verification_result.get("actual_recovered", 0.0) > 0:
        try:
            import asyncio, threading
            from app.main import broadcast_event as _broadcast
            def _fire():
                loop = asyncio.new_event_loop()
                loop.run_until_complete(_broadcast("payment_recovered", {
                    "event_id": event.id,
                    "amount": verification_result.get("actual_recovered", 0.0),
                    "action": decision["action"],
                }))
                loop.close()
            threading.Thread(target=_fire, daemon=True).start()
        except Exception:
            pass  # WebSocket broadcast is non-critical

    return ActionResponse(
        event_id=event.id,
        action=decision["action"],
        policy_check=policy_result,
        execution=action_result,
        verification=verification_result,
    )


@router.post("/opportunities/{event_id}/orchestrate")
async def orchestrate_recovery(event_id: str, db: Session = Depends(get_db)):
    """Execute the full recovery orchestration for a revenue event."""
    orchestrator = RecoveryOrchestrator()
    trace = orchestrator.run(event_id, db)
    return trace


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/dashboard/metrics")
def get_dashboard_metrics(db: Session = Depends(get_db)):
    """Aggregated metrics for the dashboard."""
    from sqlalchemy import func as _func

    total_at_risk: int = (
        db.query(_func.count(RevenueEvent.id))
        .filter(RevenueEvent.status == "AT_RISK")
        .scalar() or 0
    )
    total_amount_at_risk: float = float(
        db.query(_func.sum(RevenueEvent.amount_at_risk))
        .filter(RevenueEvent.status == "AT_RISK")
        .scalar() or 0.0
    )

    # Query total recovered amount from RecoveryAction table where status = "SUCCESS"
    total_recovered = float(
        db.query(_func.sum(RecoveryAction.actual_recovered))
        .filter(RecoveryAction.status == "SUCCESS")
        .scalar() or 0.0
    )

    # Load latest experiment report to get incremental_revenue
    incremental_revenue = 0.0
    try:
        reports_dir = os.path.normpath(
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "experiments")
        )
        files = sorted(glob.glob(os.path.join(reports_dir, "report_*.json")))
        if files:
            with open(files[-1], "r") as f:
                latest_report = json.load(f)
                # Extract comparison.incremental_recovered
                incremental_revenue = float(
                    latest_report.get("comparison", {}).get("incremental_recovered", 0.0)
                )
    except Exception:
        # If any error occurs, default to 0.0
        incremental_revenue = 0.0

    # Use a representative average recovery probability (from heuristic baseline)
    # rather than calling the model 200 times per request — keeps response < 1s
    AVG_RECOVERY_PROB = 0.14  # ~14% average across all actions from heuristic
    expected_recoverable = total_amount_at_risk * AVG_RECOVERY_PROB

    recovery_rate = 0.0

    return {
        "total_revenue_at_risk": total_amount_at_risk,
        "total_amount_at_risk": total_amount_at_risk,
        "expected_recoverable": expected_recoverable,
        "total_recovered": total_recovered,
        "incremental_revenue": incremental_revenue,
        "recovery_rate": recovery_rate,
        "active_opportunities": total_at_risk,
    }


def _dashboard_metrics_impl(db: Session):
    pass  # kept for compatibility


# ── Audit Trail ───────────────────────────────────────────────────────────────

@router.get("/audit-trail/{event_id}")
def get_audit_trail(event_id: str, db: Session = Depends(get_db)):
    """Return all audit events for a given revenue event, oldest first."""
    from app.models import AuditEvent

    events = (
        db.query(AuditEvent)
        .filter(AuditEvent.entity_id == event_id)
        .order_by(AuditEvent.timestamp)
        .all()
    )
    return [
        {
            "id": e.id,
            "timestamp": e.timestamp.isoformat() if e.timestamp else None,
            "event_type": e.event_type,
            "entity_id": e.entity_id,
            "entity_type": e.entity_type,
            "actor": e.actor,
            "action_taken": e.action_taken,
            "details": json.loads(e.details) if e.details else {},
        }
        for e in events
    ]


# ── Experiment ────────────────────────────────────────────────────────────────

@router.get("/experiment/latest")
def get_latest_experiment():
    """Return the most recent experiment report from data/experiments/."""
    reports_dir = os.path.normpath(
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "experiments")
    )
    files = sorted(glob.glob(os.path.join(reports_dir, "report_*.json")))
    if not files:
        raise HTTPException(
            status_code=404,
            detail="No experiment reports found. Run an experiment first via POST /experiment/run",
        )
    with open(files[-1], "r") as f:
        return json.load(f)


@router.post("/experiment/run")
def run_experiment_endpoint():
    """Trigger a new experiment (sample_size=500) in a background thread."""
    from app.experimentation.runner import run_experiment

    def _run():
        try:
            run_experiment(seed=12345, sample_size=500)
        except Exception as exc:
            print(f"[experiment] Failed: {exc}")

    threading.Thread(target=_run, daemon=True).start()
    return {
        "status": "started",
        "message": "Experiment running in background. Check GET /experiment/latest in ~60 seconds.",
    }


# ── Failure Lab ───────────────────────────────────────────────────────────────

@router.get("/failure-lab/{scenario}")
def failure_lab(scenario: str):
    """
    Simulate a named failure-lab scenario and return the policy decision.

    Scenarios: disputed_payment | amount_exceeded | retry_limit | contact_limit | opt_out
    """
    SCENARIOS = {
        "disputed_payment": {
            "description": "Payment flagged as disputed — all recovery actions blocked.",
            "amount": 500.0,
            "disputed": True,
            "action": "immediate_retry",
        },
        "amount_exceeded": {
            "description": "Amount > ₹10,000 — requires human approval, auto actions blocked.",
            "amount": 25000.0,
            "disputed": False,
            "action": "payment_link",
        },
        "retry_limit": {
            "description": "3 retries already attempted — IMMEDIATE_RETRY blocked.",
            "amount": 800.0,
            "disputed": False,
            "action": "immediate_retry",
        },
        "contact_limit": {
            "description": "3 contacts already made — NOTIFICATION blocked.",
            "amount": 600.0,
            "disputed": False,
            "action": "notification",
        },
        "opt_out": {
            "description": "Normal ₹1,200 payment — action auto-approved (happy path).",
            "amount": 1200.0,
            "disputed": False,
            "action": "payment_link",
        },
    }

    if scenario not in SCENARIOS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown scenario '{scenario}'. Valid options: {list(SCENARIOS.keys())}",
        )

    cfg = SCENARIOS[scenario]
    fake_payment_id = str(uuid.uuid4())

    # Minimal fake objects — policy engine only reads these fields
    class _FakeEvent:
        id = str(uuid.uuid4())
        payment_id = fake_payment_id
        amount_at_risk = cfg["amount"]
        status = "AT_RISK"
        root_cause = "insufficient_funds"
        detected_at = datetime.utcnow()

    class _FakePayment:
        id = fake_payment_id
        disputed = cfg["disputed"]
        customer_id = None

    class _FakeDB:
        """Minimal DB mock: returns fake payment; reports 3 previous retries/contacts."""
        def query(self, model):
            return self
        def filter(self, *a):
            return self
        def first(self):
            return _FakePayment()
        def join(self, *a):
            return self
        def count(self):
            return 3  # triggers retry_limit / contact_limit blocks

    policy_result = check_policy(_FakeEvent(), cfg["action"], db=_FakeDB())

    return {
        "scenario": scenario,
        "description": cfg["description"],
        "amount": cfg["amount"],
        "action_attempted": cfg["action"],
        "policy_decision": policy_result,
    }


@router.get("/failure-dna")
def get_failure_dna(db: Session = Depends(get_db)):
    """Return the failure DNA map showing best actions for each root cause."""
    dna = FailureDNA()
    return dna.get_dna_map(db)
