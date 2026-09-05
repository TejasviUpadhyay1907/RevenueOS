"""
Recovery Orchestrator for RevenueOS.
Orchestrates the full recovery process by calling various agents in sequence.
"""

from typing import Dict, Any
from app.models import RevenueEvent, Payment, Customer, Merchant
from app.agents.root_cause_agent import explain_failure
from app.ai_planner import suggest_intervention
from app.policy_engine import check_policy
from app.execution_layer import execute_action
from app.verification_layer import verify_outcome
from app.ml.stopping_oracle import StoppingOracle
from app.audit_trail import log_audit


class RecoveryOrchestrator:
    """
    Orchestrates the full recovery process for a revenue event.
    Calls various agents in sequence and logs each step to the audit trail.
    """

    def run(self, event_id: str, db) -> Dict[str, Any]:
        """
        Execute the full recovery orchestration for a revenue event.

        Args:
            event_id: The ID of the revenue event to process
            db: Database session

        Returns:
            Dict containing the full trace of all agent outputs
        """
        # Initialize trace dictionary
        trace = {
            "event_id": event_id,
            "steps": []
        }

        # Step 1: Fetch the RevenueEvent, Payment, Customer, Merchant from db
        revenue_event = db.query(RevenueEvent).filter(RevenueEvent.id == event_id).first()
        if not revenue_event:
            raise ValueError(f"Revenue event with ID {event_id} not found")

        payment = db.query(Payment).filter(Payment.id == revenue_event.payment_id).first()
        customer = db.query(Customer).filter(Customer.id == payment.customer_id).first() if payment else None
        merchant = db.query(Merchant).filter(Merchant.id == payment.merchant_id).first() if payment else None

        # Log fetching entities
        self._log_audit_step(
            db, "fetch_entities",
            {"event_id": event_id},
            {
                "revenue_event_found": revenue_event is not None,
                "payment_found": payment is not None,
                "customer_found": customer is not None,
                "merchant_found": merchant is not None
            },
            trace
        )

        if not all([revenue_event, payment, customer, merchant]):
            raise ValueError("Could not fetch all required entities for the revenue event")

        # Step 2: Call RootCauseAgent (explain_failure from root_cause_agent.py) → stores explanation
        explanation = explain_failure(revenue_event, payment, customer, merchant)
        self._log_audit_step(
            db, "root_cause_agent",
            {
                "event_id": event_id,
                "root_cause": getattr(revenue_event, 'root_cause', 'unknown'),
                "amount": getattr(revenue_event, 'amount_at_risk', 0)
            },
            {"explanation": explanation},
            trace
        )

        # Step 3: Call StrategyAgent (suggest_intervention from ai_planner.py) → stores decision
        decision = suggest_intervention(revenue_event, db)
        self._log_audit_step(
            db, "strategy_agent",
            {
                "event_id": event_id,
                "amount_at_risk": revenue_event.amount_at_risk
            },
            decision,
            trace
        )

        # Step 4: Call PolicyAgent (check_policy from policy_engine.py) → stores policy result
        policy_result = check_policy(revenue_event, decision["action"], db)
        self._log_audit_step(
            db, "policy_agent",
            {
                "event_id": event_id,
                "proposed_action": decision["action"],
                "amount_at_risk": revenue_event.amount_at_risk
            },
            policy_result,
            trace
        )

        # Initialize results for conditional steps
        execution_result = None
        verification_result = None
        oracle_decision = None

        # Step 5: If policy approved:
        if policy_result.get("approved", False):
            # a. Call ExecutionAgent (execute_action from execution_layer.py) → stores execution
            execution_result = execute_action(revenue_event, decision["action"], db)
            self._log_audit_step(
                db, "execution_agent",
                {
                    "event_id": event_id,
                    "action": decision["action"],
                    "action_id": execution_result.get("action_id")
                },
                {
                    "success": execution_result.get("success"),
                    "actual_recovered": execution_result.get("actual_recovered")
                },
                trace
            )

            # b. Call VerificationAgent (verify_outcome from verification_layer.py) → stores verification
            verification_result = verify_outcome(revenue_event, execution_result, db)
            self._log_audit_step(
                db, "verification_agent",
                {
                    "event_id": event_id,
                    "action": decision["action"],
                    "execution_success": execution_result.get("success", False)
                },
                {
                    "success": verification_result.get("success"),
                    "actual_recovered": verification_result.get("actual_recovered")
                },
                trace
            )

            # c. Call StoppingOracle → stores oracle decision
            stopping_oracle = StoppingOracle()
            attempted_actions = [decision["action"]]  # In this simple case, we've only attempted one action
            oracle_decision = stopping_oracle.should_stop(revenue_event, attempted_actions, db)
            self._log_audit_step(
                db, "stopping_oracle",
                {
                    "event_id": event_id,
                    "action": decision["action"],
                    "verification_success": verification_result.get("success", False) if verification_result else False
                },
                oracle_decision,
                trace
            )
        else:
            # If policy not approved, still log that we skipped execution steps
            self._log_audit_step(
                db, "policy_denial",
                {
                    "event_id": event_id,
                    "proposed_action": decision["action"],
                    "policy_reason": policy_result.get("reason", "Unknown")
                },
                {"skipped_execution": True},
                trace
            )

        # Compile final trace
        trace.update({
            "explanation": explanation,
            "decision": decision,
            "policy_result": policy_result,
            "execution_result": execution_result,
            "verification_result": verification_result,
            "oracle_decision": oracle_decision
        })

        return trace

    def _log_audit_step(self, db, agent_name: str, input_data: Dict[str, Any],
                       output_data: Dict[str, Any], trace: Dict[str, Any]) -> None:
        """
        Log an agent step to both the audit trail and the trace.

        Args:
            db: Database session
            agent_name: Name of the agent being logged
            input_data: Input data provided to the agent
            output_data: Output data received from the agent
            trace: The trace dictionary to append the step to
        """
        # Create step record for trace
        step_record = {
            "agent": agent_name,
            "input": input_data,
            "output": output_data
        }
        trace["steps"].append(step_record)

        # Log to audit trail
        try:
            log_audit(
                db=db,
                event_type=f"agent_{agent_name}",
                entity_id=input_data.get("event_id", "unknown"),
                entity_type="revenue_event",
                actor="system",
                action_taken=f"run_{agent_name}",
                details_dict={
                    "input_summary": str(input_data)[:200],  # Truncate for brevity
                    "output_summary": str(output_data)[:200]  # Truncate for brevity
                }
            )
        except Exception:
            # Don't let audit logging failures break the orchestrator
            pass