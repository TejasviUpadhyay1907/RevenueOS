"""
Counterfactual simulator for RevenueOS.
Provides deterministic outcomes for (event_id, action) pairs based on ground truth.
"""

import json
import os
from typing import Dict, Any, Optional

class CounterfactualSimulator:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(CounterfactualSimulator, cls).__new__(cls)
            cls._instance._lookup = {}
            cls._instance._load_ground_truth()
        return cls._instance

    def _load_ground_truth(self):
        """Load ground_truth.json and payment_events.json to build lookup dictionary."""
        ground_truth_path = os.path.join(
            os.path.dirname(__file__), '..', '..', '..', 'data', 'synthetic', 'ground_truth.json'
        )
        payment_events_path = os.path.join(
            os.path.dirname(__file__), '..', '..', '..', 'data', 'synthetic', 'payment_events.json'
        )
        with open(ground_truth_path, 'r') as f:
            ground_truth_data = json.load(f)
        with open(payment_events_path, 'r') as f:
            payment_events = json.load(f)

        # Map event_id -> amount
        amount_by_event = {p['id']: p['amount'] for p in payment_events}

        # Build lookup: {event_id: {action: {success, recovered_amount}}}
        for gt in ground_truth_data:
            event_id = gt['event_id']
            amount = amount_by_event.get(event_id, 0.0)
            self._lookup[event_id] = {
                # Map ground truth actions to our action names
                'no_action': {
                    'success': bool(gt['would_recover_without_intervention']),
                    'recovered_amount': amount if gt['would_recover_without_intervention'] else 0.0
                },
                'immediate_retry': {
                    'success': bool(gt['would_recover_with_action_A']),
                    'recovered_amount': amount if gt['would_recover_with_action_A'] else 0.0
                },
                'payment_link': {
                    'success': bool(gt['would_recover_with_action_B']),
                    'recovered_amount': amount if gt['would_recover_with_action_B'] else 0.0
                },
                'notification': {
                    'success': bool(gt['would_recover_with_action_C']),
                    'recovered_amount': amount if gt['would_recover_with_action_C'] else 0.0
                },
                'delayed_retry': {
                    'success': bool(gt['would_recover_with_action_A']),  # same as immediate
                    'recovered_amount': amount if gt['would_recover_with_action_A'] else 0.0
                },
                'human_escalation': {
                    'success': bool(gt['would_recover_with_action_B']),  # same as payment link
                    'recovered_amount': amount if gt['would_recover_with_action_B'] else 0.0
                }
            }

    def simulate(self, event_id: str, action: str, action_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Look up deterministic outcome for (event_id, action).
        action_id is for idempotency: same action_id always returns same result.
        Returns: {success, recovered_amount, attempts, contacts, cost}
        """
        # For idempotency, we could use action_id to seed something, but since outcomes
        # are deterministic from ground truth, same (event_id, action) always gives same result.
        # We'll ignore action_id for now but keep the parameter for compatibility.

        if event_id not in self._lookup:
            # Fallback: if event not in ground truth (should not happen with our data)
            return {
                'success': False,
                'recovered_amount': 0.0,
                'attempts': 1,
                'contacts': 1 if action in ['payment_link', 'notification', 'human_escalation'] else 0,
                'cost': 0.0
            }

        result = self._lookup[event_id].get(action)
        if result is None:
            # Action not found (should not happen)
            return {
                'success': False,
                'recovered_amount': 0.0,
                'attempts': 1,
                'contacts': 1 if action in ['payment_link', 'notification', 'human_escalation'] else 0,
                'cost': 0.0
            }

        # Determine attempts, contacts, cost based on action type
        action_costs = {
            'no_action': {'attempts': 0, 'contacts': 0, 'cost': 0.0},
            'immediate_retry': {'attempts': 1, 'contacts': 0, 'cost': 1.0},
            'delayed_retry': {'attempts': 1, 'contacts': 0, 'cost': 1.0},
            'payment_link': {'attempts': 1, 'contacts': 1, 'cost': 2.0},
            'notification': {'attempts': 1, 'contacts': 1, 'cost': 0.5},
            'human_escalation': {'attempts': 1, 'contacts': 2, 'cost': 50.0},
        }

        costs = action_costs.get(action, {'attempts': 1, 'contacts': 0, 'cost': 0.0})

        return {
            'success': result['success'],
            'recovered_amount': result['recovered_amount'],
            'attempts': costs['attempts'],
            'contacts': costs['contacts'],
            'cost': costs['cost']
        }

def get_simulator() -> CounterfactualSimulator:
    """Get the singleton simulator instance."""
    return CounterfactualSimulator()