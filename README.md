<h1 align="center">
  <br />
  💰 RevenueOS
  <br />
</h1>

<h3 align="center">AI-Powered Revenue Recovery for Razorpay Merchants</h3>

<p align="center">
  <b>Razorpay AI Buildathon 2025 — Track 03: AI Revenue Recovery</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Track-AI%20Revenue%20Recovery-10b981?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Stack-FastAPI%20%2B%20Next.js-3b82f6?style=for-the-badge" />
  <img src="https://img.shields.io/badge/ML-XGBoost-f97316?style=for-the-badge" />
  <img src="https://img.shields.io/badge/AI-7%20Agent%20Pipeline-8b5cf6?style=for-the-badge" />
</p>

---

## 🎯 What is RevenueOS?

RevenueOS is an **agentic AI system** that detects failed payments, diagnoses the root cause, selects the optimal recovery action, executes it within policy guardrails, verifies the outcome, and maintains a full audit trail — all automatically.

**The result:** 10.4× more revenue recovered versus fixed-schedule retry, on the same 500 payments.

> Every money action is explainable, bounded, and gated.  
> Every decision has an audit trail.  
> Every failure is handled gracefully.

---

## 📊 Key Results

| Metric | Fixed Retry (Baseline) | RevenueOS (AI) | Lift |
|--------|----------------------|----------------|------|
| Recovery Rate | 8.2% | 28.7% | **+20.5pp** |
| Amount Recovered | ₹83,200 | ₹866,400 | **10.4×** |
| Incremental Revenue | — | **₹8,63,200** | — |
| Actions Blocked by Policy | — | 100% compliant | ✅ |
| Audit Trail | None | Every decision | ✅ |

*Results from controlled A/B experiment on 500 synthetic Razorpay payments.*

---

## 🤖 The 7-Agent Pipeline

Every failed payment passes through a sequential agent chain:

```
┌─────────────────────────────────────────────────────────────────┐
│                    REVENUEOS AGENT PIPELINE                     │
├──────────┬──────────────────────────────────────────────────────┤
│ Agent 1  │  Root Cause Agent                                    │
│          │  Classifies failure: insufficient_funds, bank_block, │
│          │  expired_card, network_timeout, fraud_flag, etc.     │
├──────────┼──────────────────────────────────────────────────────┤
│ Agent 2  │  Strategy Agent                                      │
│          │  XGBoost model scores 6 possible actions:            │
│          │  immediate_retry, payment_link, OTP, notification,   │
│          │  settlement_advance, escalate_human                  │
├──────────┼──────────────────────────────────────────────────────┤
│ Agent 3  │  Policy Agent                                        │
│          │  Enforces hard rules: no retry if disputed,          │
│          │  human approval if amount > ₹10K, max 3 contacts     │
├──────────┼──────────────────────────────────────────────────────┤
│ Agent 4  │  Execution Agent                                     │
│          │  Calls Razorpay API: creates payment links,          │
│          │  triggers retries, sends notifications               │
├──────────┼──────────────────────────────────────────────────────┤
│ Agent 5  │  Verification Agent                                  │
│          │  Confirms outcome, measures actual amount recovered  │
├──────────┼──────────────────────────────────────────────────────┤
│ Agent 6  │  Stopping Oracle                                     │
│          │  Halts the pipeline if expected recovery < cost,     │
│          │  or if customer signals opt-out                      │
├──────────┼──────────────────────────────────────────────────────┤
│ Agent 7  │  Audit Agent                                         │
│          │  Immutable log of every decision, actor, timestamp   │
└──────────┴──────────────────────────────────────────────────────┘
```

---

## 🧠 ML Model

- **Algorithm:** XGBoost classifier (6-class: one per recovery action)
- **Features:** payment amount, hour of day, day of week, historical success rate, payment method, failure reason, failure pattern, merchant plan
- **Training:** 10,000 synthetic Razorpay-style payments
- **Output:** Ranked probability scores for each action → highest expected value wins
- **Explainability:** Feature importance scores surfaced in the UI Decision Trace page

---

## 🛡️ Policy Guardrails (The Bar)

RevenueOS cannot be tricked into unsafe actions:

| Rule | Behaviour |
|------|-----------|
| Disputed payment | All actions **blocked** |
| Amount > ₹10,000 | **Human approval required**, auto actions blocked |
| 3+ retries attempted | IMMEDIATE_RETRY **blocked** |
| 3+ contacts made | NOTIFICATION **blocked** |
| Expected value < cost | Stopping oracle **halts** pipeline |
| Customer opt-out | All outreach **blocked** |

Every block is logged in the audit trail with reason, actor, and timestamp.

---

## 🗂️ Pages & Features

| Page | What it does |
|------|-------------|
| **Dashboard** | Live metrics: total at-risk, expected recoverable, incremental recovery |
| **Opportunities** | Ranked list of 500 failed payments with ML recovery scores — click Execute |
| **Decision Trace** | Full XGBoost action ranking + LLM root cause explanation per payment |
| **Failure DNA** | Heatmap of best actions by failure type (insufficient_funds → payment_link, etc.) |
| **Failure Lab** | Interactive policy sandbox — test all 5 guardrail scenarios live |
| **Experiment** | A/B proof: run 500-payment experiment, see 10.4× lift vs fixed retry |
| **ROI Proof** | Drag slider to your monthly volume → see projected annual recovery |

---

## 🏗️ Architecture

```
┌─────────────────────┐     ┌──────────────────────────┐
│   Next.js Frontend  │────▶│   FastAPI Backend         │
│   Port 3001         │◀────│   Port 8001               │
│                     │ WS  │                           │
│  7 pages            │     │  /api/v1/opportunities    │
│  Dark + Light mode  │     │  /api/v1/experiment       │
│  JWT Auth           │     │  /api/v1/failure-lab      │
│  WebSocket live     │     │  /api/v1/failure-dna      │
└─────────────────────┘     │  /api/v1/dashboard        │
                            │  /auth/login              │
                            └──────────┬───────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
             ┌──────▼─────┐   ┌────────▼──────┐  ┌──────▼──────┐
             │  SQLite DB  │   │  XGBoost ML   │  │  OpenRouter │
             │  31,477     │   │  Model        │  │  LLM (GPT)  │
             │  payments   │   │  (trained)    │  │  Explains   │
             └────────────┘   └───────────────┘  └─────────────┘
                                       │
                            ┌──────────▼───────────┐
                            │   Razorpay Test API   │
                            │   Payment Links       │
                            │   Retry Triggers      │
                            └──────────────────────┘
```

---

## 🚀 Local Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- Git

### 1. Clone & install

```bash
git clone https://github.com/your-username/revenueos.git
cd revenueos
```

### 2. Backend setup

```bash
cd backend
pip install -r requirements.txt
```

### 3. Environment variables

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

```env
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=XXXXXXXXXXXXXXXXXXXXXXXX
OPENROUTER_API_KEY=sk-or-v1-XXXXXXXX
```

Get Razorpay test keys: [dashboard.razorpay.com](https://dashboard.razorpay.com) → Settings → API Keys → Test Mode

Get OpenRouter key: [openrouter.ai/keys](https://openrouter.ai/keys)

### 4. Seed the database

```bash
cd backend
python -m app.db.seed
```

### 5. Start the backend

```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```

### 6. Frontend setup

```bash
cd frontend
npm install
npm run dev -- -p 3001
```

### 7. Open the app

```
http://localhost:3001
```

**Login credentials:**
```
Email:    demo@revenueos.in
Password: Demo@2025
```

---

## 🧪 Running the Experiment

1. Open [http://localhost:3001/experiment](http://localhost:3001/experiment)
2. Click **"Re-run Experiment"**
3. Wait ~60 seconds
4. See live A/B comparison: RevenueOS vs fixed-retry baseline on 500 payments

Or via API:

```bash
# Trigger experiment
curl -X POST http://localhost:8001/api/v1/experiment/run

# Check results (~60s later)
curl http://localhost:8001/api/v1/experiment/latest
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/opportunities` | Ranked recovery opportunities |
| `GET` | `/api/v1/opportunities/{id}/decision` | AI decision trace for one payment |
| `POST` | `/api/v1/opportunities/{id}/execute` | Execute recovery action |
| `POST` | `/api/v1/opportunities/{id}/orchestrate` | Full 7-agent pipeline |
| `GET` | `/api/v1/dashboard/metrics` | Aggregated dashboard metrics |
| `GET` | `/api/v1/failure-dna` | Failure DNA map |
| `GET` | `/api/v1/failure-lab/{scenario}` | Policy sandbox scenarios |
| `GET` | `/api/v1/experiment/latest` | Latest experiment report |
| `POST` | `/api/v1/experiment/run` | Trigger new experiment |
| `GET` | `/api/v1/audit-trail/{event_id}` | Audit log for a payment |
| `POST` | `/auth/login` | JWT login |
| `POST` | `/auth/signup` | Register new user |
| `GET` | `/auth/me` | Current user info |
| `WS` | `/ws` | WebSocket live recovery events |

Full interactive docs: [http://localhost:8001/docs](http://localhost:8001/docs)

---

## 📁 Project Structure

```
revenueos/
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── root_cause_agent.py     # LLM failure diagnosis
│   │   │   ├── failure_dna.py          # Best-action heatmap
│   │   │   └── orchestrator.py         # 7-agent pipeline runner
│   │   ├── api/v1/
│   │   │   └── revenue.py              # All REST endpoints
│   │   ├── ml/
│   │   │   ├── training.py             # XGBoost model training
│   │   │   └── action_recovery_model.py # Inference + explanations
│   │   ├── decision/
│   │   │   ├── scoring.py              # Expected value scoring
│   │   │   └── strategy_engine.py      # Action selection
│   │   ├── experimentation/
│   │   │   └── runner.py               # A/B experiment framework
│   │   ├── ai_planner.py               # Strategy agent
│   │   ├── policy_engine.py            # Policy guardrails
│   │   ├── execution_layer.py          # Razorpay API calls
│   │   ├── verification_layer.py       # Outcome verification
│   │   ├── recoverability_model.py     # Recovery probability
│   │   ├── opportunity_engine.py       # Expected value calc
│   │   ├── auth.py                     # JWT authentication
│   │   └── main.py                     # FastAPI app + WebSocket
│   └── requirements.txt
├── frontend/
│   ├── pages/
│   │   ├── index.js                    # Dashboard
│   │   ├── opportunities.js            # Recovery queue
│   │   ├── decision.js                 # Decision trace
│   │   ├── failure-dna.js              # DNA heatmap
│   │   ├── failure-lab.js              # Policy sandbox
│   │   ├── experiment.js               # A/B experiment
│   │   └── proof.js                    # ROI calculator
│   ├── components/
│   │   └── Layout.js                   # Sidebar + theme toggle
│   └── styles/
│       └── globals.css                 # CSS variables (dark + light)
├── data/
│   ├── synthetic/                      # 31,477 synthetic payments
│   └── experiments/                    # Experiment reports (JSON)
├── .env                                # Credentials (not committed)
├── .env.example                        # Template
└── README.md
```

---

## 🎬 Demo Script (5-minute pitch)

| Time | Action | What to show |
|------|--------|-------------|
| 0:00 | Login page | "31,477 failed payments. ₹4.2 crore at risk." |
| 0:20 | Dashboard | Live metrics, incremental recovery counter |
| 0:35 | Opportunities | Ranked list, ML scores, click Execute |
| 0:55 | Decision Trace | XGBoost ranking + LLM explanation |
| 1:20 | Run Full Pipeline | 7 agents fire in sequence, audit trail fills |
| 1:45 | Failure Lab | Click Disputed → blocked. Click Amount Exceeded → blocked. |
| 2:10 | Experiment | ₹8.6L incremental, 10.4× lift vs baseline |
| 2:35 | ROI Proof | Drag slider to ₹10Cr/month → ₹1.2Cr annual recovery |
| 2:50 | Failure DNA | Heatmap of best actions by failure type |
| 3:00 | End | "Every action explained. Every decision bounded. Every rupee traced." |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, Tailwind CSS, Framer Motion |
| Backend | FastAPI, Python 3.11, Uvicorn |
| ML Model | XGBoost, scikit-learn, pandas, numpy |
| LLM | OpenRouter (GPT-4o-mini) via OpenAI SDK |
| Payments | Razorpay SDK (test mode) |
| Database | SQLite (31,477 payments) |
| Auth | JWT (demo mode) |
| Realtime | WebSocket (live recovery counter) |
| Experiment | Custom A/B framework with statistical comparison |

---

## 👤 Author

**Tejas**  
Built for Razorpay AI Buildathon 2025 — Track 03: AI Revenue Recovery

---

<p align="center">
  <i>Every rupee recovered. Every decision traced. Every merchant protected.</i>
</p>
