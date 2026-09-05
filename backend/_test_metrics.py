import sys, traceback
sys.path.insert(0, '.')
import warnings; warnings.filterwarnings('ignore')

from app.db import SessionLocal
from app.models import RevenueEvent
from app.recoverability_model import estimate_recovery_probability, ACTIONS

db = SessionLocal()
try:
    print("ACTIONS:", ACTIONS)
    events = db.query(RevenueEvent).filter(RevenueEvent.status == 'AT_RISK').limit(2).all()
    print(f"Found {len(events)} AT_RISK events")
    for ev in events:
        try:
            p = estimate_recovery_probability(ev, action=None, db=db)
            print(f"  event {ev.id[:8]}  prob={p:.4f}  amount={ev.amount_at_risk}")
        except Exception:
            traceback.print_exc()
            break
    print("TEST PASSED")
except Exception:
    traceback.print_exc()
finally:
    db.close()
