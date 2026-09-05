# RevenueOS Architecture

## Overview
RevenueOS is a modular system designed to recover revenue at risk through intelligent decision-making and safe execution.

## Core Modules

### 1. Revenue Radar
- Continuously scans for revenue-at-risk events (failed payments, checkout abandonment, etc.)
- Aggregates and displays metrics: total at risk, highly recoverable, medium, low, recovered, incremental revenue, recovery rate, active opportunities.

### 2. Root Cause Intelligence
- Determines why revenue is at risk using deterministic data (error codes, transaction details) and LLM for contextual explanation.
- Outputs a root cause category and confidence.

### 3. Recoverability Model
- Machine learning model that predicts the probability of recovery for each revenue event.
- Features: transaction amount, payment method, failure reason, customer history, time of day, etc.
- Outputs: recovery_probability, confidence, expected_recovery_value.

### 4. Revenue Opportunity Engine
- Ranks opportunities by expected value: revenue_at_risk * recovery_probability * intervention_success_probability - costs - penalties.
- Produces a prioritized list of opportunities.

### 5. AI Recovery Planner
- Selects an intervention from a predefined set (smart retry, payment link, notification, etc.) using structured tool calling.
- Returns a structured decision with action, reason, confidence, expected_recovery.

### 6. Policy Engine
- Validates AI recommendations against business rules (amount limits, retry limits, contact limits, dispute, opt-out, approval requirements).
- deterministic and configurable.

### 7. Execution Layer
- Carries out the approved action via adapters (Razorpay API, notification service, etc.).
- Each tool is idempotent, includes validation, timeout handling, and audit logging.

### 8. Verification
- After an action, verifies the outcome (payment status, recovery status) and records the actual recovered amount.

### 9. Counterfactual/Baseline Engine
- Compares RevenueOS performance against a baseline strategy (fixed retries, generic notifications) to measure incremental revenue.

### 10. Learning Loop
- Collects outcomes (event, context, decision, action, result) to improve the model and policies via controlled offline retraining.

### 11. Decision Trace & Audit Trail
- Logs every step of the decision-making process for explainability and compliance.

### 12. Dashboard (Revenue Command Center)
- Provides UI for monitoring, decision traces, opportunity queue, policy center, experiments, analytics, audit log, and failure lab.

## Data Flow
1. Revenue event (webhook) -> Revenue Radar (detects) -> Root Cause Intelligence -> Recoverability Model -> Opportunity Engine -> AI Planner -> Policy Engine -> Execution -> Verification -> Dashboard update & Learning Loop.
2. Audit trail captures each step.

## Technology Stack
- Backend: Python, FastAPI, PostgreSQL, SQLAlchemy, Alembic, Redis
- ML: scikit-learn, XGBoost (for interpretability)
- Frontend: Next.js, TypeScript, Tailwind CSS
- Razorpay: Official Python SDK in test mode
- Others: Docker, pytest, httpx, pydantic

## Safety & Compliance
- LLM never directly executes money actions; always passes through policy engine.
- Idempotency keys prevent duplicate actions.
- Webhook signature verification.
- No hard-coded secrets.
- Role-based access (though simplified for MVP).
- Structured logging and immutable audit logs.

## Deployment
- Docker Compose for local development.
- Environment variables for configuration.