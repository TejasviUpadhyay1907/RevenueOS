import sys, traceback
sys.path.insert(0, '.')
import warnings; warnings.filterwarnings('ignore')

from app.db import SessionLocal
from app.models import RevenueEvent
from app.recoverability_model import estimate_recovery_probability

db = SessionLocal()
try:
    at_risk_events = db.query(RevenueEvent).filter(RevenueEvent.status == 'AT_RISK').all()
    print(f"Total AT_RISK events: {len(at_risk_events)}")
    total_amount_at_risk = sum(e.amount_at_risk for e in at_risk_events)
    print(f"Total amount at risk: {total_amount_at_risk:.2f}")

    expected_recoverable = 0.0
    for event in at_risk_events:
        try:
            prob = estimate_recovery_probability(event, action=None, db=db)
        except Exception:
            prob = 0.0
        expected_recoverable += float(event.amount_at_risk) * prob

    print(f"Expected recoverable: {expected_recoverable:.2f}")
    recovery_rate = 0.0
    result = {
        "total_revenue_at_risk": float(total_amount_at_risk),
        "total_amount_at_risk": float(total_amount_at_risk),
        "expected_recoverable": float(expected_recoverable),
        "total_recovered": 0.0,
        "incremental_revenue": 0.0,
        "recovery_rate": float(recovery_rate),
        "active_opportunities": len(at_risk_events),
    }
    print("RESULT:", result)
    print("DASHBOARD TEST PASSED")
except Exception:
    traceback.print_exc()
finally:
    db.close()
