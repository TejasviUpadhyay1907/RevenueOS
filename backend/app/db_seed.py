"""
Seed the database with synthetic data.
"""

import json
import os
import uuid
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base, Merchant, Customer, Payment, RevenueEvent, RecoveryOpportunity, RecoveryDecision, RecoveryAction, Policy, AuditEvent

# Database connection - use SQLite for simplicity in seed
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./revenueos.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_tables():
    Base.metadata.create_all(bind=engine)

def load_json(filepath):
    with open(filepath, 'r') as f:
        return json.load(f)

def seed_merchants(db, merchants_data):
    for m in merchants_data:
        merchant = Merchant(
            id=m['id'],
            name=m['name'],
            created_at=datetime.fromisoformat(m['created_at']),
            is_active=m['is_active'],
            plan=m['plan'],
            avg_ticket_size=m['avg_ticket_size']
        )
        db.add(merchant)
    db.commit()

def seed_customers(db, customers_data):
    for c in customers_data:
        customer = Customer(
            id=c['id'],
            merchant_id=c['merchant_id'],
            name=c['name'],
            email=c['email'],
            phone=c['phone'],
            created_at=datetime.fromisoformat(c['created_at']),
            is_active=c['is_active'],
            historical_success_rate=c['historical_success_rate'],
            avg_transaction_value=c['avg_transaction_value'],
            failure_pattern=c['failure_pattern']
        )
        db.add(customer)
    db.commit()

def seed_payments(db, payments_data):
    for p in payments_data:
        payment = Payment(
            id=p['id'],
            merchant_id=p['merchant_id'],
            customer_id=p['customer_id'],
            amount=p['amount'],
            currency=p['currency'],
            attempted_at=datetime.fromisoformat(p['attempted_at']) if p['attempted_at'] else None,
            payment_method=p['payment_method'],
            gateway=p['gateway'],
            order_id=p['order_id'],
            payment_id=p['payment_id'],
            success=p['success'],
            failure_reason=p['failure_reason'],
            failure_code=p['failure_code'],
            auth_id=p['auth_id'],
            settled_at=datetime.fromisoformat(p['settled_at']) if p['settled_at'] else None,
            refunded=p['refunded'],
            disputed=p['disputed'],
            metadata=json.dumps(p['metadata'])
        )
        db.add(payment)
    db.commit()

def seed_revenue_events(db, payments_data, ground_truth_data):
    # We need to map payment_id to ground truth
    # We'll create a dictionary from event_id to ground truth
    gt_dict = {gt['event_id']: gt for gt in ground_truth_data}
    for p in payments_data:
        if not p['success']:  # Only create revenue events for failed payments
            gt = gt_dict.get(p['id'])
            if gt:
                revenue_event = RevenueEvent(
                    id=str(uuid.uuid4()),
                    payment_id=p['id'],
                    amount_at_risk=p['amount'],
                    detected_at=datetime.fromisoformat(p['attempted_at']),
                    status='AT_RISK',
                    root_cause=p['failure_reason'],
                    recovery_probability=gt['recovery_probability_B'],  # Using action B as default
                    expected_recovery=gt['expected_recovery_B'],
                    confidence='Medium'  # We can set based on probability
                )
                db.add(revenue_event)
    db.commit()

def seed_policies(db):
    # Create a default policy
    policy = Policy(
        id=str(uuid.uuid4()),
        name='default',
        description='Default recovery policy',
        amount_limit=10000.0,  # ₹10,000
        max_retries=3,
        max_contacts=3,
        require_approval_above=10000.0,
        stop_on_dispute=True,
        stop_on_opt_out=True,
        is_active=True
    )
    db.add(policy)
    db.commit()

def main():
    # Create tables
    create_tables()
    
    # Create a session
    db = SessionLocal()
    
    try:
        # Load data from JSON files
        base_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'data', 'synthetic')
        merchants_data = load_json(os.path.join(base_path, 'merchants.json'))
        customers_data = load_json(os.path.join(base_path, 'customers.json'))
        payments_data = load_json(os.path.join(base_path, 'payment_events.json'))
        ground_truth_data = load_json(os.path.join(base_path, 'ground_truth.json'))
        
        # Seed data
        print("Seeding merchants...")
        seed_merchants(db, merchants_data)
        
        print("Seeding customers...")
        seed_customers(db, customers_data)
        
        print("Seeding payments...")
        seed_payments(db, payments_data)
        
        print("Seeding revenue events...")
        seed_revenue_events(db, payments_data, ground_truth_data)
        
        print("Seeding policies...")
        seed_policies(db)
        
        print("Seeding completed.")
    finally:
        db.close()

if __name__ == "__main__":
    main()