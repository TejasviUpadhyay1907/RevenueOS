from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import RecoveryAction, RecoveryDecision, RevenueEvent


class FailureDNA:
    """
    Builds a per-failure-code recovery profile showing which action works best
    for each root cause, computed from historical execution outcomes.
    """

    def build(self, db: Session):
        """Kept for API compatibility — work is done in get_dna_map."""
        pass

    def get_best_action(self, root_cause: str, db: Session) -> dict:
        """Return the action_type with highest recovery_rate for a given failure code."""
        results = self._query_by_root_cause(root_cause, db)
        if not results:
            return {"action_type": None, "recovery_rate": 0.0, "sample_size": 0}

        best = max(results, key=lambda r: r["rate"])
        return {
            "action_type": best["action"],
            "recovery_rate": best["rate"],
            "sample_size": best["sample_size"],
        }

    def get_dna_map(self, db: Session) -> list:
        """
        Return a list of dicts, one per root_cause:
        { root_cause, best_action, recovery_rate, sample_size, all_actions }
        """
        # Get all distinct root causes that have been acted on
        root_causes = (
            db.query(RevenueEvent.root_cause)
            .join(RecoveryDecision, RecoveryDecision.revenue_event_id == RevenueEvent.id)
            .join(RecoveryAction, RecoveryAction.recovery_decision_id == RecoveryDecision.id)
            .distinct()
            .all()
        )
        root_causes = [rc[0] for rc in root_causes if rc[0] is not None]

        # If no execution history yet, fall back to heuristic-based DNA from event data only
        if not root_causes:
            return self._heuristic_dna_map(db)

        dna_map = []
        for root_cause in root_causes:
            actions = self._query_by_root_cause(root_cause, db)
            if not actions:
                continue
            best = max(actions, key=lambda r: r["rate"])
            dna_map.append({
                "root_cause": root_cause,
                "best_action": best["action"],
                "recovery_rate": best["rate"],
                "sample_size": best["sample_size"],
                "all_actions": actions,
            })

        return dna_map

    def _query_by_root_cause(self, root_cause: str, db: Session) -> list:
        """Query action outcomes grouped by action_type for a given root cause."""
        rows = (
            db.query(
                RecoveryAction.action_type,
                func.count(RecoveryAction.id).label("total"),
                func.sum(
                    func.case(
                        (RecoveryAction.status == "SUCCESS", 1),
                        else_=0
                    )
                ).label("successes"),
                func.avg(RecoveryAction.actual_recovered).label("avg_recovered"),
            )
            .join(RecoveryDecision, RecoveryAction.recovery_decision_id == RecoveryDecision.id)
            .join(RevenueEvent, RecoveryDecision.revenue_event_id == RevenueEvent.id)
            .filter(RevenueEvent.root_cause == root_cause)
            .group_by(RecoveryAction.action_type)
            .all()
        )

        results = []
        for action_type, total, successes, avg_recovered in rows:
            if total and total > 0:
                results.append({
                    "action": action_type,
                    "rate": float(successes or 0) / float(total),
                    "sample_size": int(total),
                    "avg_recovered_amount": float(avg_recovered or 0.0),
                })
        return results

    def _heuristic_dna_map(self, db: Session) -> list:
        """
        When no execution history exists, return a static heuristic DNA map
        based on known payment failure patterns.
        """
        heuristics = [
            {
                "root_cause": "insufficient_funds",
                "best_action": "delayed_retry",
                "recovery_rate": 0.34,
                "sample_size": 0,
                "all_actions": [
                    {"action": "delayed_retry", "rate": 0.34, "sample_size": 0, "avg_recovered_amount": 0},
                    {"action": "notification", "rate": 0.18, "sample_size": 0, "avg_recovered_amount": 0},
                    {"action": "immediate_retry", "rate": 0.08, "sample_size": 0, "avg_recovered_amount": 0},
                ],
            },
            {
                "root_cause": "expired_card",
                "best_action": "payment_link",
                "recovery_rate": 0.28,
                "sample_size": 0,
                "all_actions": [
                    {"action": "payment_link", "rate": 0.28, "sample_size": 0, "avg_recovered_amount": 0},
                    {"action": "notification", "rate": 0.12, "sample_size": 0, "avg_recovered_amount": 0},
                ],
            },
            {
                "root_cause": "issuer_decline",
                "best_action": "delayed_retry",
                "recovery_rate": 0.41,
                "sample_size": 0,
                "all_actions": [
                    {"action": "delayed_retry", "rate": 0.41, "sample_size": 0, "avg_recovered_amount": 0},
                    {"action": "immediate_retry", "rate": 0.15, "sample_size": 0, "avg_recovered_amount": 0},
                ],
            },
            {
                "root_cause": "gateway_timeout",
                "best_action": "immediate_retry",
                "recovery_rate": 0.67,
                "sample_size": 0,
                "all_actions": [
                    {"action": "immediate_retry", "rate": 0.67, "sample_size": 0, "avg_recovered_amount": 0},
                    {"action": "delayed_retry", "rate": 0.45, "sample_size": 0, "avg_recovered_amount": 0},
                ],
            },
            {
                "root_cause": "transaction_not_allowed",
                "best_action": "payment_link",
                "recovery_rate": 0.22,
                "sample_size": 0,
                "all_actions": [
                    {"action": "payment_link", "rate": 0.22, "sample_size": 0, "avg_recovered_amount": 0},
                    {"action": "human_escalation", "rate": 0.19, "sample_size": 0, "avg_recovered_amount": 0},
                ],
            },
            {
                "root_cause": "currency_not_supported",
                "best_action": "human_escalation",
                "recovery_rate": 0.15,
                "sample_size": 0,
                "all_actions": [
                    {"action": "human_escalation", "rate": 0.15, "sample_size": 0, "avg_recovered_amount": 0},
                ],
            },
        ]
        return heuristics
