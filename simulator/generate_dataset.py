"""
Synthetic data generator for RevenueOS.
Generates merchants, customers, payment events, and per-action counterfactual outcomes.
"""

import random
from datetime import datetime, timedelta
import uuid
import json
from faker import Faker

fake = Faker()

def generate_merchants(n=10):
    merchants = []
    for i in range(n):
        created_at = fake.date_time_between(start_date='-2y', end_date='now')
        merchant = {
            "id": str(uuid.uuid4()),
            "name": fake.company(),
            "created_at": created_at,
            "is_active": random.choice([True, False]),
            "plan": random.choice(["starter", "growth", "enterprise"]),
            "avg_ticket_size": round(random.uniform(100, 10000), 2)
        }
        merchants.append(merchant)
    return merchants

def generate_customers(merchants, n_per_merchant=1000):
    customers = []
    for merchant in merchants:
        for _ in range(n_per_merchant):
            customer = {
                "id": str(uuid.uuid4()),
                "merchant_id": merchant["id"],
                "name": fake.name(),
                "email": fake.email(),
                "phone": fake.phone_number(),
                "created_at": fake.date_time_between(start_date=merchant["created_at"], end_date='now'),
                "is_active": random.choice([True, False]),
                "payment_methods": [
                    {
                        "type": random.choice(["card", "upi", "netbanking", "wallet"]),
                        "last4": str(random.randint(1000, 9999)),
                        "exp_month": f"{random.randint(1, 12):02d}",
                        "exp_year": f"{random.randint(24, 30)}",
                        "is_expired": random.choice([True, False]) if random.random() < 0.1 else False,
                        "token": fake.uuid4()
                    }
                    for _ in range(random.randint(1, 3))
                ],
                "historical_success_rate": round(random.uniform(0.7, 0.99), 2),
                "avg_transaction_value": round(random.uniform(50, 5000), 2),
                "failure_pattern": random.choice(["none", "insufficient_funds", "expired_card", "issuer_decline", "technical"])
            }
            customers.append(customer)
    return customers

def generate_payment_events(merchants, customers, n_events=50000):
    events = []
    failure_reasons = [
        "insufficient_funds",
        "issuer_decline",
        "expired_card",
        "invalid_cvv",
        "transaction_not_allowed",
        "duplicate_transaction",
        "suspected_fraud",
        "technical_error",
        "gateway_timeout",
        "bank_decline",
        "otp_limit_exceeded",
        "invalid_amount",
        "currency_not_supported",
        "acquirer_decline",
        "void"
    ]
    
    for i in range(n_events):
        merchant = random.choice(merchants)
        merchant_customers = [c for c in customers if c["merchant_id"] == merchant["id"]]
        if not merchant_customers:
            continue
        customer = random.choice(merchant_customers)
        
        base_success_rate = customer["historical_success_rate"]
        if customer["failure_pattern"] != "none":
            base_success_rate *= 0.3
        
        amount = round(random.uniform(10, merchant["avg_ticket_size"] * 5), 2)
        
        attempted_at = fake.date_time_between(start_date='-1y', end_date='now')
        success = random.random() < base_success_rate
        
        event = {
            "id": str(uuid.uuid4()),
            "merchant_id": merchant["id"],
            "customer_id": customer["id"],
            "amount": amount,
            "currency": "INR",
            "attempted_at": attempted_at,
            "payment_method": random.choice(customer["payment_methods"])["type"] if customer["payment_methods"] else "card",
            "gateway": "razorpay",
            "order_id": f"order_{uuid.uuid4().hex[:10]}",
            "payment_id": f"pay_{uuid.uuid4().hex[:10]}" if success else None,
            "success": success,
            "failure_reason": None if success else random.choice(failure_reasons),
            "failure_code": None if success else random.randint(1000, 9999),
            "auth_id": f"auth_{uuid.uuid4().hex[:10]}" if success else None,
            "settled_at": (attempted_at + timedelta(days=2)) if success else None,
            "refunded": False,
            "disputed": False,
            "metadata": {
                "ip_address": fake.ipv4(),
                "user_agent": fake.user_agent(),
                "device": random.choice(["mobile", "desktop", "tablet"]),
                "is_international": random.choice([True, False]) if random.random() < 0.05 else False
            }
        }
        events.append(event)
    return events

def generate_ground_truth(events):
    """
    For each event, determine per-action counterfactual outcomes.
    Actions: NO_ACTION, IMMEDIATE_RETRY, DELAYED_RETRY, PAYMENT_LINK, NOTIFICATION, HUMAN_ESCALATION
    We approximate using the three action ground truth we have.
    """
    ground_truth = []
    for event in events:
        # Base recovery probability without intervention (natural recovery)
        base_rec_prob = 0.05  # 5% chance of natural recovery (e.g., customer fixes issue)
        
        # Adjust based on failure reason
        failure_reason = event["failure_reason"]
        if failure_reason == "insufficient_funds":
            base_rec_prob = 0.15
        elif failure_reason == "expired_card":
            base_rec_prob = 0.02
        elif failure_reason == "issuer_decline":
            base_rec_prob = 0.08
        elif failure_reason == "technical_error":
            base_rec_prob = 0.25
        elif failure_reason == "gateway_timeout":
            base_rec_prob = 0.30
        else:
            base_rec_prob = 0.03
        
        # Further adjust by customer's historical success rate (approximate via amount)
        amount_factor = min(event["amount"] / 10000, 1.0)
        base_rec_prob *= (0.5 + amount_factor * 0.5)
        base_rec_prob = min(base_rec_prob, 0.9)
        
        # Define three intervention effectiveness factors (relative to base)
        # Action A: Smart retry (low cost, low-medium effectiveness) -> factor 1.5
        # Action B: Payment link (medium cost, medium-high effectiveness) -> factor 2.0
        # Action C: Notification + Payment link (higher cost, higher effectiveness) -> factor 2.5
        factor_A = 1.5
        factor_B = 2.0
        factor_C = 2.5
        
        prob_A = min(base_rec_prob * factor_A, 0.9)
        prob_B = min(base_rec_prob * factor_B, 0.9)
        prob_C = min(base_rec_prob * factor_C, 0.9)
        
        # Map to our six actions
        # NO_ACTION: natural recovery probability (base_rec_prob)
        # IMMEDIATE_RETRY: similar to smart retry (prob_A)
        # DELAYED_RETRY: similar to payment link (prob_B) [delay may reduce prob slightly, but we ignore]
        # PAYMENT_LINK: prob_B
        # NOTIFICATION: prob_C
        # HUMAN_ESCALATION: same as PAYMENT_LINK (prob_B) (human escalation may increase success but we keep same)
        
        prob_no = base_rec_prob
        prob_immediate = prob_A
        prob_delayed = prob_B
        prob_payment = prob_B
        prob_notification = prob_C
        prob_human = prob_B
        
        would_no = random.random() < prob_no
        would_immediate = random.random() < prob_immediate
        would_delayed = random.random() < prob_delayed
        would_payment = random.random() < prob_payment
        would_notification = random.random() < prob_notification
        would_human = random.random() < prob_human
        
        ground_truth.append({
            "event_id": event["id"],
            # NO_ACTION
            "would_recover_no_action": would_no,
            "recovered_amount_no_action": event["amount"] if would_no else 0.0,
            "time_to_recovery_hours_no_action": 0.0 if would_no else -1.0,  # -1 indicates not recovered
            "attempts_required_no_action": 0 if would_no else 0,
            "customer_contacts_no_action": 0,
            "action_cost_no_action": 0.0,
            # IMMEDIATE_RETRY
            "would_recover_immediate_retry": would_immediate,
            "recovered_amount_immediate_retry": event["amount"] if would_immediate else 0.0,
            "time_to_recovery_hours_immediate_retry": 1.0 if would_immediate else -1.0,
            "attempts_required_immediate_retry": 1 if would_immediate else 0,
            "customer_contacts_immediate_retry": 0,
            "action_cost_immediate_retry": 0.5,  # small cost
            # DELAYED_RETRY
            "would_recover_delayed_retry": would_delayed,
            "recovered_amount_delayed_retry": event["amount"] if would_delayed else 0.0,
            "time_to_recovery_hours_delayed_retry": 6.0 if would_delayed else -1.0,
            "attempts_required_delayed_retry": 1 if would_delayed else 0,
            "customer_contacts_delayed_retry": 0,
            "action_cost_delayed_retry": 0.5,
            # PAYMENT_LINK
            "would_recover_payment_link": would_payment,
            "recovered_amount_payment_link": event["amount"] if would_payment else 0.0,
            "time_to_recovery_hours_payment_link": 2.0 if would_payment else -1.0,
            "attempts_required_payment_link": 1 if would_payment else 0,
            "customer_contacts_payment_link": 1,
            "action_cost_payment_link": 1.0,
            # NOTIFICATION
            "would_recover_notification": would_notification,
            "recovered_amount_notification": event["amount"] if would_notification else 0.0,
            "time_to_recovery_hours_notification": 4.0 if would_notification else -1.0,
            "attempts_required_notification": 0 if would_notification else 0,
            "customer_contacts_notification": 1,
            "action_cost_notification": 0.3,
            # HUMAN_ESCALATION
            "would_recover_human_escalation": would_human,
            "recovered_amount_human_escalation": event["amount"] if would_human else 0.0,
            "time_to_recovery_hours_human_escalation": 1.0 if would_human else -1.0,
            "attempts_required_human_escalation": 1 if would_human else 0,
            "customer_contacts_human_escalation": 1,
            "action_cost_human_escalation": 5.0  # high cost
        })
    return ground_truth

def convert_datetime_to_str(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {k: convert_datetime_to_str(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_datetime_to_str(i) for i in obj]
    else:
        return obj

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=None)
    args = parser.parse_args()
    if args.seed is not None:
        random.seed(args.seed)
        fake.seed_instance(args.seed)
    
    print("Generating synthetic data for RevenueOS...")
    
    merchants = generate_merchants(n=10)
    print(f"Generated {len(merchants)} merchants")
    
    customers = generate_customers(merchants, n_per_merchant=500)  # 500 per merchant for 50k total events
    print(f"Generated {len(customers)} customers")
    
    events = generate_payment_events(merchants, customers, n_events=50000)
    print(f"Generated {len(events)} payment events")
    
    ground_truth = generate_ground_truth(events)
    print(f"Generated ground truth for {len(ground_truth)} events")
    
    # Convert datetime objects to strings for JSON serialization
    merchants = convert_datetime_to_str(merchants)
    customers = convert_datetime_to_str(customers)
    events = convert_datetime_to_str(events)
    # ground_truth already has no datetime objects (only floats, bools, strings)
    
    import os
    os.makedirs("../data/synthetic", exist_ok=True)
    
    with open("../data/synthetic/merchants.json", "w") as f:
        json.dump(merchants, f, indent=2)
    
    with open("../data/synthetic/customers.json", "w") as f:
        json.dump(customers, f, indent=2)
    
    with open("../data/synthetic/payment_events.json", "w") as f:
        json.dump(events, f, indent=2)
    
    with open("../data/synthetic/ground_truth.json", "w") as f:
        json.dump(ground_truth, f, indent=2)
    
    print("Data saved to ../data/synthetic/")
    
    successful_events = sum(1 for e in events if e["success"])
    print(f"\nSuccessful payments: {successful_events}/{len(events)} ({successful_events/len(events)*100:.1f}%)")
    
    failed_events = [e for e in events if not e["success"]]
    print(f"Failed payments: {len(failed_events)}")
    
    if failed_events:
        failure_reasons = {}
        for e in failed_events:
            reason = e["failure_reason"]
            failure_reasons[reason] = failure_reasons.get(reason, 0) + 1
        print("Failure reasons distribution:")
        for reason, count in sorted(failure_reasons.items(), key=lambda x: x[1], reverse=True):
            print(f"  {reason}: {count} ({count/len(failed_events)*100:.1f}%)")
    
    # Expected recovery stats from ground truth for each action
    exp_rec_no = sum(gt["recovered_amount_no_action"] for gt in ground_truth)
    exp_rec_im = sum(gt["recovered_amount_immediate_retry"] for gt in ground_truth)
    exp_rec_del = sum(gt["recovered_amount_delayed_retry"] for gt in ground_truth)
    exp_rec_pay = sum(gt["recovered_amount_payment_link"] for gt in ground_truth)
    exp_rec_not = sum(gt["recovered_amount_notification"] for gt in ground_truth)
    exp_rec_hum = sum(gt["recovered_amount_human_escalation"] for gt in ground_truth)
    print(f"\nExpected recovery (ground truth) per action:")
    print(f"  NO_ACTION: ₹{exp_rec_no:,.2f}")
    print(f"  IMMEDIATE_RETRY: ₹{exp_rec_im:,.2f}")
    print(f"  DELAYED_RETRY: ₹{exp_rec_del:,.2f}")
    print(f"  PAYMENT_LINK: ₹{exp_rec_pay:,.2f}")
    print(f"  NOTIFICATION: ₹{exp_rec_not:,.2f}")
    print(f"  HUMAN_ESCALATION: ₹{exp_rec_hum:,.2f}")