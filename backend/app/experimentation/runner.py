"""
Experiment runner for RevenueOS.
Runs both the baseline and RevenueOS strategies on a held-out test set and compares them.
"""

import json
import os
import random
import uuid
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import RevenueEvent, Payment
from app.experimentation.baseline import FixedRetryBaseline
from app.experimentation.metrics import compute_metrics
from app.experimentation.reports import generate_report, save_report
from app.ai_planner import suggest_intervention, plan_recovery
from app.experimentation.simulator import get_simulator
from app import db

def run_experiment(seed: int = 12345, sample_size: Optional[int] = None) -> Dict[str, Any]:
    """
    Run the experiment comparing FixedRetryBaseline and RevenueOSUtilityStrategy.

    Args:
        seed: Random seed for reproducibility (used for sampling if sample_size is set)
        sample_size: Number of events to sample from the test set. If None, use the entire test set.

    Returns:
        The experiment report as a dict.
    """
    # Set random seeds for reproducibility
    random.seed(seed)

    # Get a database session
    db_session = db.SessionLocal()

    try:
        # We need to get the held-out test set. According to the master prompt,
        # we should use a temporal split: the last 20% by attempted_at.
        # We'll get the revenue events that are AT_RISK and have a payment with attempted_at.
        # We'll order by attempted_at and take the last 20% as test.

        # First, get the count of AT_RISK revenue events
        total_events = db_session.query(RevenueEvent).filter(RevenueEvent.status == "AT_RISK").count()
        if total_events == 0:
            raise ValueError("No AT_RISK revenue events found in the database.")

        # We'll get the list of revenue_event ids ordered by detected_at (which is set to payment.attempted_at in the seed)
        # We'll use the detected_at column in revenue_event for ordering.
        # We'll get the offset for the test set: 80% train, 20% test -> test starts at 80% of the total.
        # But note: the master prompt says 60% train, 20% val, 20% test. We'll use the last 20% as test.
        # We'll compute the offset for the test set: skip the first 80% (train+val) and take the last 20%.
        # However, we don't have the validation set separated in the data. We'll just use the last 20% as test.
        # This is acceptable for the demo.

        offset = int(0.8 * total_events)  # skip the first 80%
        limit = total_events - offset if sample_size is None else min(sample_size, total_events - offset)

        # Get the test set revenue events
        test_events = db_session.query(RevenueEvent).filter(
            RevenueEvent.status == "AT_RISK"
        ).order_by(RevenueEvent.detected_at).offset(offset).limit(limit).all()

        if not test_events:
            # Fallback: if the above doesn't work, just take a random sample
            test_events = db_session.query(RevenueEvent).filter(
                RevenueEvent.status == "AT_RISK"
            ).order_by(func.random()).limit(sample_size or total_events).all()

        print(f"Running experiment on {len(test_events)} events (seed={seed})...")

        # Initialize strategies
        baseline_strategy = FixedRetryBaseline(max_retries=3)
        # We'll use the RevenueOSUtilityStrategy from the strategy_engine
        from app.decision.strategy_engine import RevenueOSUtilityStrategy
        revenueos_strategy = RevenueOSUtilityStrategy()

        # Initialize simulator
        simulator = get_simulator()

        # We'll collect results for each strategy
        baseline_results = []
        revenueos_results = []

        # For each event in the test set, run both strategies
        for i, event in enumerate(test_events):
            if i % 100 == 0:
                print(f"  Processing event {i+1}/{len(test_events)}")

            # --- Baseline strategy ---
            # We'll simulate a cascade of up to 3 steps for the baseline.
            # We'll use the same cascade logic as in the AI planner but with the baseline strategy.
            attempted_actions_baseline = []
            baseline_recovered = 0.0
            baseline_attempts = 0
            baseline_contacts = 0
            baseline_cost = 0.0
            baseline_step_index = 0
            while baseline_step_index < 3:  # max_steps=3
                # Get the baseline decision
                decision = baseline_strategy.select_action(
                    event,
                    db=db_session,
                    retry_count=len([a for a in attempted_actions_baseline if a in ["immediate_retry", "delayed_retry"]]),
                    step_index=baseline_step_index
                )
                action = decision["action"]
                if action == "no_action":
                    break
                # For the baseline, we don't need to check policy because the baseline strategy already returns an action that is within policy?
                # But we should check policy to be safe.
                policy_check = None
                if db_session:
                    from app.policy_engine import check_policy
                    policy_check = check_policy(event, action, db=db_session)
                if not policy_check or not policy_check.get("approved", False):
                    # If not approved, we break and consider this step as not executed.
                    break
                # Execute the action via the simulator
                outcome = simulator.simulate(
                    event_id=event.payment_id,
                    action=action,
                    action_id=str(uuid.uuid4()) if 'uuid' in globals() else None
                )
                # Update counters
                baseline_recovered += outcome["recovered_amount"]
                baseline_attempts += outcome["attempts"]
                baseline_contacts += outcome["contacts"]
                baseline_cost += outcome["cost"]
                attempted_actions_baseline.append(action)
                # If we recovered, we break (success)
                if outcome["recovered_amount"] > 0:
                    break
                baseline_step_index += 1

            baseline_results.append({
                "recovered": baseline_recovered,
                "amount_at_risk": event.amount_at_risk,
                "attempts": baseline_attempts,
                "contacts": baseline_contacts,
                "cost": baseline_cost
            })

            # --- RevenueOS strategy ---
            # We'll use the AI planner to get a cascade of up to 3 steps.
            # The AI planner's plan_recovery function returns a list of steps.
            # We'll run it and accumulate the results.
            attempted_actions_revenueos = []
            revenueos_recovered = 0.0
            revenueos_attempts = 0
            revenueos_contacts = 0
            revenueos_cost = 0.0
            # We'll call plan_recovery with max_steps=3
            plan_steps = suggest_intervention.__globals__['plan_recovery'](event, db_session, max_steps=3)
            # The plan_recovery function returns a list of step dicts.
            # We'll iterate through the steps and simulate each action until we get a success or run out of steps.
            for step in plan_steps:
                action = step["action"]
                if action == "no_action":
                    break
                # Check policy (the plan_recovery function already checks policy in the strategy, but we double-check)
                policy_check = step.get("policy_check")
                if not policy_check or not policy_check.get("approved", False):
                    break
                # Execute the action via the simulator
                outcome = simulator.simulate(
                    event_id=event.payment_id,
                    action=action,
                    action_id=str(uuid.uuid4()) if 'uuid' in globals() else None
                )
                # Update counters
                revenueos_recovered += outcome["recovered_amount"]
                revenueos_attempts += outcome["attempts"]
                revenueos_contacts += outcome["contacts"]
                revenueos_cost += outcome["cost"]
                attempted_actions_revenueos.append(action)
                # If we recovered, we break (success)
                if outcome["recovered_amount"] > 0:
                    break

            revenueos_results.append({
                "recovered": revenueos_recovered,
                "amount_at_risk": event.amount_at_risk,
                "attempts": revenueos_attempts,
                "contacts": revenueos_contacts,
                "cost": revenueos_cost
            })

        # Compute metrics for each strategy
        baseline_metrics = compute_metrics(baseline_results)
        revenueos_metrics = compute_metrics(revenueos_results)

        # Generate and save the report
        report = generate_report(seed, baseline_metrics, revenueos_metrics, sample_size=len(test_events))
        report_path = save_report(report, directory="data/experiments")
        print(f"Experiment report saved to {report_path}")

        return report

    finally:
        db_session.close()

if __name__ == "__main__":
    # When run directly, run an experiment with seed 12345 and no sample size limit (use the entire test set)
    run_experiment(seed=12345, sample_size=None)