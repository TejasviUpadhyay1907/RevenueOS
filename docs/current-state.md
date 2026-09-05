# RevenueOS - Current State Analysis

## Overview
This document outlines the current state of the RevenueOS project as of the initial setup.

## What Already Works

### Backend
- FastAPI application is running and responding to health checks.
- API endpoints for revenue events, opportunities, decisions, execution, and metrics are defined.
- Database seeded with synthetic data (10 merchants, 5,000 customers, 50,000 payment events).
- Basic recoverability model (heuristic-based) is in place.
- Opportunity engine calculates expected value.
- AI planner suggests actions based on simple rules.
- Policy engine checks against amount limits.
- Execution layer simulates actions (smart retry, payment link, notification).
- Verification layer checks action outcomes.
- Pydantic models for API responses.
- Basic test suite passes (2 tests for root and health endpoints).

### Frontend
- Next.js application set up with Tailwind CSS.
- Home page fetches and displays metrics from the backend.
- Basic layout for dashboard.

### Data
- Synthetic dataset generated with:
  - 10 merchants
  - 5,000 customers
  - 50,000 payment events (with success/failure)
  - Ground truth for recovery probabilities of three actions (A, B, C)
- Failure reasons distributed across 15 categories (e.g., insufficient_funds, issuer_decline, technical_error).

### Infrastructure
- Docker Compose file for backend, frontend, PostgreSQL, Redis (though currently using SQLite for simplicity).
- Environment variables template.

## What is Incomplete / Mocked

### Recoverability Model
- Currently a heuristic that assigns recovery probability based on failure reason and amount.
- No machine learning model trained on data.
- No feature engineering beyond simple heuristics.

### Opportunity Engine
- Uses a fixed intervention success probability (0.8) for all events.
- Does not consider action-specific success probabilities, costs, or friction.

### AI Planner
- Rule-based action selection (notification, smart retry, payment link) based on probability thresholds.
- No actual AI or language model involvement; purely deterministic.

### Policy Engine
- Only checks if amount exceeds automatic recovery limit (₹10,000).
- Does not implement retry limits, contact limits, dispute handling, opt-out, or human approval workflow.

### Execution Layer
- Simulates action success/failure based on random chance.
- No actual integration with Razorpay or other payment gateways.
- No idempotency keys or duplicate prevention.

### Verification Layer
- Trusts the execution result without re-verifying with an external source.
- No actual payment status checks.

### Audit Trail
- No audit event logging implemented.
- No decision trace storage.

### Frontend
- Only the home page is implemented.
- Missing pages for opportunity inbox, decision trace, experiments, failure lab, etc.
- No interactive elements (e.g., triggering actions, viewing details).

### Testing
- Only two basic tests for the backend endpoints.
- No unit tests for core modules (recoverability model, opportunity engine, etc.).
- No integration tests for the full flow.
- No failure scenario tests.

### Experimentation & Baseline
- No baseline strategy defined.
- No experiment runner or comparison framework.
- No metrics for incremental revenue calculation.

## What is Heuristic
- Recoverability model: based on failure reason and amount.
- AI planner: rule-based thresholds.
- Execution: random success based on probability.
- Policy: simple amount limit.

## What is Genuinely AI/ML
- None currently. All components are heuristic or rule-based.

## Current Data Model
- Tables: merchants, customers, payments, revenue_events, recovery_opportunities, recovery_decisions, recovery_actions, policies, audit_events.
- The seed data has populated merchants, customers, payments, and revenue_events (for failed payments).
- Other tables are empty.

## Current API Structure
- GET /api/v1/revenue-events: list revenue events (failed payments) at risk.
- GET /api/v1/opportunities: list ranked opportunities (by expected value).
- GET /api/v1/opportunities/{event_id}/decision: get AI planner's decision for an event.
- POST /api/v1/opportunities/{event_id}/execute: execute the suggested action for an event.
- GET /api/v1/dashboard/metrics: get key metrics (revenue at risk, expected recoverable, etc.).

## Current Technical Debt
- Use of deprecated `orm_mode` in Pydantic models (should be `from_attributes` in V2).
- Database seed script uses absolute paths that may break.
- Heuristic models need replacement with trainable ML.
- Lack of proper error handling and logging.
- No authentication or authorization.
- No input validation beyond Pydantic.
- No rate limiting.
- No API documentation (Swagger/OpenAPI) configured.
- Frontend and backend are not fully integrated (only metrics and opportunities fetched).

## Recommended Changes
1. Replace heuristic recoverability model with a trainable model (Logistic Regression, then Random Forest/XGBoost).
2. Implement feature engineering that does not leak future information.
3. Create a proper train/validation/test split (temporal if possible).
4. Evaluate model with precision, recall, F1, ROC-AUC, etc.
5. Build a strategy engine with multiple recovery actions (no action, immediate retry, delayed retry, payment link, notification, etc.).
6. Implement expected recovery value calculation per strategy.
7. Enhance policy engine with retry limits, contact limits, dispute/opt-out handling, and human approval.
8. Add audit trail for decisions and actions.
9. Improve verification to simulate actual payment status checks.
10. Implement idempotency for actions.
11. Create baseline strategy (fixed retries) for comparison.
12. Build experiment runner to compare RevenueOS vs baseline.
13. Expand frontend to show opportunity inbox, decision trace, experiment results, and failure lab.
14. Write comprehensive unit and integration tests.
15. Add structured logging and error handling.
16. Configure API documentation (Swagger).
17. Ensure environment variables are used for configuration (e.g., database URL, policy limits).
18. Remove any hardcoded fake metrics or claims.

## Immediate Next Steps for Phase 1
1. Improve synthetic dataset to include ground truth for eventual recovery (already partially done).
2. Build a real recoverability model (Logistic Regression) using the synthetic data.
3. Implement expected value calculation per strategy.
4. Develop a strategy engine with multiple candidates.
5. Enhance policy engine with more rules.
6. Implement audit trail.
7. Run experiments to compare baseline and RevenueOS.
8. Update frontend to show decision trace and experiment results.
9. Write tests for new components.