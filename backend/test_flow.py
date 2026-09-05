"""
Test script to verify the RevenueOS flow.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from db import SessionLocal
from models import RevenueEvent, Payment, Customer, Merchant
from recoverability_model import estimate_recovery_probability
from opportunity_engine import calculate_expected_value
from ai_planner import suggest_intervention
from policy_engine import check_policy
from execution_layer import execute_action
from verification_layer import verify_outcome

def test_flow():
    # Create a database session
    db = SessionLocal()
    
    try:
        # Get the first revenue event that is AT_RISK
        event = db.query(RevenueEvent).filter(RevenueEvent.status == "AT_RISK").first()
        if not event:
            print("No AT_RISK revenue events found.")
            return
        
        print(f"Found revenue event: {event.id}")
        print(f"Amount at risk: {event.amount_at_risk}")
        print(f"Root cause: {event.root_cause}")
        
        # Get related payment, customer, merchant for feature extraction (if needed by the model)
        payment = db.query(Payment).filter(Payment.id == event.payment_id).first()
        customer = db.query(Customer).filter(Customer.id == payment.customer_id).first() if payment else None
        merchant = db.query(Merchant).filter(Merchant.id == payment.merchant_id).first() if payment else None
        
        # Estimate recovery probability (using our model)
        prob = estimate_recovery_probability(event, db)
        print(f"Estimated recovery probability: {prob:.2f}")
        
        # Calculate expected value (using a default intervention success probability of 0.8)
        expected_value = calculate_expected_value(event.amount_at_risk, prob, 0.8)
        print(f"Expected value (with intervention success prob 0.8): {expected_value:.2f}")
        
        # Get AI planner's decision
        decision = suggest_intervention(event, db)
        print(f"AI suggested action: {decision['action']}")
        print(f"Reason: {decision['reason']}")
        print(f"Confidence: {decision['confidence']:.2f}")
        print(f"Expected recovery: {decision['expected_recovery']:.2f}")
        
        # Check policy
        policy_result = check_policy(event, decision['action'], db)
        print(f"Policy check: {policy_result}")
        
        if policy_result.get('approved', False):
            # Execute the action
            action_result = execute_action(event, decision['action'], db)
            print(f"Execution result: {action_result}")
            
            # Verify the outcome
            verification_result = verify_outcome(event, action_result, db)
            print(f"Verification result: {verification_result}")
        else:
            print(f"Action blocked by policy: {policy_result.get('reason')}")
    
    finally:
        db.close()

if __name__ == "__main__":
    test_flow()