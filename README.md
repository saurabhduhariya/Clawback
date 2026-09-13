<div align="center">

  <h1>💰 Clawback — AI Revenue Recovery</h1>
  <p><strong>An autonomous AI agent built to recover lost revenue for Razorpay merchants.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
    <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" />
    <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" />
    <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" />
    <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
    <img src="https://img.shields.io/badge/Gemini_AI-8E75B2?style=for-the-badge&logo=googlebard&logoColor=white" />
    <img src="https://img.shields.io/badge/LangGraph-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white" />
  </p>
  <p>
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square" />
    <img src="https://img.shields.io/badge/Frontend-Vercel-black?style=flat-square&logo=vercel" />
    <img src="https://img.shields.io/badge/Backend-Render-46E3B7?style=flat-square&logo=render" />
    <img src="https://img.shields.io/badge/status-active-success?style=flat-square" />
  </p>

  <p>
    <a href="https://clawback-seven.vercel.app/" target="_blank"><img src="https://img.shields.io/badge/🚀_Live_Demo-000000?style=for-the-badge&logo=vercel&logoColor=white" /></a>
  </p>

  <img src="assets/screenshots/hero_v2.png" alt="Clawback Hero" width="100%" style="border-radius: 12px; margin-top: 20px;" />
</div>

<br/>

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Dashboard & Interface](#-dashboard--interface)
- [System Architecture](#️-system-architecture--data-pipeline)
- [AI Recovery Pipeline](#-langgraph-ai-recovery-pipeline)
- [Sequence Diagram](#-sequence-diagram--one-transactions-lifecycle)
- [Project Structure](#-project-structure)
- [Tech Stack](#-tech-stack)
- [API Reference](#-api-reference)
- [Local Development Setup](#️-local-development-setup)
- [Roadmap](#️-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 📖 Overview

**Clawback** is a powerful, autonomous revenue recovery platform designed specifically for the Razorpay ecosystem. It continuously monitors Razorpay webhooks for failed transactions — abandoned checkouts, card declines, insufficient funds, timeouts — and turns them into recoverable revenue instead of write-offs.

Instead of treating every failure the same way, Clawback uses a **LangGraph + Google Gemini AI agent** to score the risk, diagnose the root cause, and autonomously execute the best recovery strategy — creating a real Razorpay payment link or invoice, retrying the charge, escalating to a human, or marking the transaction unrecoverable.

> 💡 **In short:** a failed payment comes in → the AI scores and diagnoses it → guardrails decide if it's safe to act → if so, it executes the recovery on its own, end to end, with no manual intervention required.

---

## ✨ Key Features

| | |
|---|---|
| 🧠 **Cognitive AI Recovery** | Gemini returns a structured diagnosis — root cause, retryability, urgency, recommended action and preferred channel — rather than a rigid if/else ladder. |
| 🛡️ **Layered Guardrails** | Blocks any attempt beyond the retry cap (`MAX_RECOVERY_ATTEMPTS = 3`), and blocks non-retryable failure reasons (`mandate_revoked`, `invoice_overdue_60`). Every block maps to a terminal status so a transaction can't be re-selected on every future run. |
| ⚡ **Autonomous Execution** | Places real Razorpay API calls — `POST /v1/payment_links`, `/v1/invoices`, `/v1/orders` — with unique per-attempt reference IDs so retries don't collide. |
| 📊 **Glassmorphism Dashboard** | A premium, dark-mode React dashboard for monitoring at-risk revenue, recovery analytics, and live agent logs. |
| 🔄 **Full Audit Ledger** | Every attempt is written to `recovery_actions` — chosen action, guardrail result, exact Razorpay API called, response, and outcome — powering the audit trail and the action-effectiveness charts. |
| 🤖 **RecoverBot — AI Co-pilot** | A floating chat agent on every non-landing page. Streams tokens, shows live tool-call indicators, and can query metrics, search/diagnose transactions, run guarded read-only SQL, trigger a recovery run, and mint a real payment link. |
| 🕸️ **Live Pipeline Visualizer** | `/recover` renders the 8-node LangGraph DAG with React Flow and lights up each node as it executes, streamed over SSE. |
| 🔍 **Forensic Audit Trail** | A per-transaction timeline with the AI diagnosis and the raw Razorpay request/response JSON, inspectable and copyable. |
| 🎯 **Manual Override** | A per-row **Recover** button re-runs the agent for a single transaction, deep-linking into the live visualizer. |
| 🛩️ **Auto-Pilot Scheduler** | Toggle autonomous runs from the dashboard and pick the cadence (2h / 6h / 12h / 24h). The interval is persisted and skipped if a run is already in flight. |
| 📤 **CSV Export** | One-click export of the full recovery ledger — RFC 4180-quoted, with formula-injection guards and a UTF-8 BOM so Excel renders ₹ correctly. |
| 🧪 **Live Test Injection** | An "Add Live Test" modal injects a mock failed payment, with a failure-reason selector that maps to distinct agent behaviour. |
| 🔔 **Toast Notifications** | Run outcomes surface as bottom-right toasts — recovered amount, nothing-recovered, or stream errors. |

---

## 📸 Dashboard & Interface

<div align="center">
  <img src="assets/screenshots/landing_v2.png" alt="Clawback Home" width="49%" style="border-radius: 8px; margin-bottom: 10px;" />
  <img src="assets/screenshots/dashboard_v2.png" alt="Clawback Dashboard Analytics" width="49%" style="border-radius: 8px; margin-bottom: 10px;" />
</div>
<div align="center">
  <img src="assets/screenshots/transactions_v2.png" alt="Recovery Transactions Ledger" width="49%" style="border-radius: 8px;" />
  <img src="assets/screenshots/pipeline_v2.png" alt="LangGraph AI Pipeline" width="49%" style="border-radius: 8px;" />
</div>

### 🗺️ Application Routes

| Path | Page | What it does |
|---|---|---|
| `/` | `Landing` | Marketing page. Pulls live metrics for the hero stats and preview chart, falling back to static values. |
| `/dashboard` | `Dashboard` | KPI cards, analytics charts, the pipeline funnel widget, and the Auto-Pilot / CSV controls. |
| `/transactions` | `Transactions` | Searchable recovery ledger with risk badges, per-row **Recover**, and the **Add Live Test** modal. |
| `/recover` | `RecoveryRun` | The live 8-node pipeline visualizer plus the streaming agent log. |
| `/transactions/:transactionId` | `AuditTrail` | Per-transaction forensic view: details, AI diagnosis, recovery timeline, raw JSON. |

> The floating **RecoverBot** is mounted on every route except `/` (see `App.jsx`), and route changes animate through `<AnimatePresence>`.

---

## 🏗️ System Architecture & Data Pipeline

Clawback is built on a modern, decoupled event-driven architecture designed to securely ingest financial webhooks, process them asynchronously, and execute AI-driven recovery loops.

```mermaid
flowchart TB
    Customer([" Customer "])
    RZP{{" Razorpay\nAPI & Webhooks "}}

    subgraph ClientLayer[" CLIENT — Vercel "]
        direction TB
        UI["React / Vite Dashboard"]
        Charts["Analytics & Live Agent Logs"]
        Bot["RecoverBot\nAI Co-pilot"]
        UI --- Charts
    end

    subgraph ServerLayer[" SERVER — Render "]
        direction TB
        WebhookAPI["Webhook Receiver\n/api/webhooks"]
        Verify{{"Verify\nSignature"}}
        Scheduler["Cron Scheduler\nAuto-Pilot"]
        AgentEngine["LangGraph\n8-Node Agent"]
        Execute["Execute\nRazorpay Action"]
    end

    subgraph DataLayer[" DATABASE — Supabase "]
        DB[("PostgreSQL\ntransactions · recovery_actions\nrecovery_runs · webhook_events")]
    end

    Customer == "Payment fails" ==> RZP
    RZP -- "payment.failed webhook" --> WebhookAPI
    WebhookAPI --> Verify
    Verify -- "valid + deduped" --> DB
    Verify -. "invalid → 400" .-> WebhookAPI

    Scheduler == "trigger recovery run" ==> AgentEngine
    DB -. "fetch recoverable txns" .-> AgentEngine

    AgentEngine -- "risk score + guardrails" --> Execute
    AgentEngine -. "blocked → terminal status" .-> DB
    Execute == "payment link · invoice · order" ==> RZP
    RZP -. "entity id + short_url" .-> Execute
    Execute --> DB

    DB == "live analytics + SSE logs" ==> UI
    UI <--> Bot
    Bot -. "read-only tools" .-> DB

    RZP -. "payment.captured — not yet handled" .-> WebhookAPI

    classDef actor fill:#1a202c,stroke:#4a5568,color:#f7fafc,font-weight:bold
    classDef client fill:#2b6cb0,stroke:#1a4971,color:#fff,font-weight:bold
    classDef server fill:#276749,stroke:#1c4532,color:#fff,font-weight:bold
    classDef gate fill:#975a16,stroke:#7b341e,color:#fff,font-weight:bold
    classDef data fill:#742a2a,stroke:#521b1b,color:#fff,font-weight:bold

    class Customer,RZP actor
    class UI,Charts,Bot client
    class WebhookAPI,Scheduler,AgentEngine,Execute server
    class Verify gate
    class DB data

    style ClientLayer fill:#0f1a2e,stroke:#2b6cb0,stroke-width:1px,color:#fff
    style ServerLayer fill:#0f2419,stroke:#276749,stroke-width:1px,color:#fff
    style DataLayer fill:#2e1414,stroke:#742a2a,stroke-width:1px,color:#fff
```

> Thick arrows (`==>`) mark the primary revenue path, solid arrows are synchronous calls, and dotted arrows show async or fallback paths — guardrail blocks, invalid signatures, and the `payment.captured` event that is **not yet wired up**.

---

## 🤖 LangGraph AI Recovery Pipeline

The core intelligence of Clawback is powered by a **LangGraph State Machine** using Google Gemini. The agent walks an 8-node graph — wired in `server/graph/recoveryGraph.js` — with exactly one conditional edge: the guardrail verdict.

```mermaid
stateDiagram-v2
    [*] --> detect : Scheduler · Webhook · Chat · Manual

    state detect {
        direction TB
        FetchTxn : Load transaction row
        LoadAttempts : Load past attempts
    }

    state calculateRiskScore {
        direction TB
        F1 : Past failures (0-30)
        F2 : Amount at risk (0-25)
        F3 : Failure severity (0-25)
        F4 : Age of failure (0-20)
    }

    state diagnose {
        direction LR
        Gemini : Gemini 3.5 Flash structured diagnosis
    }

    state checkGuardrails {
        direction TB
        Rule1 : Max attempts reached (3)
        Rule2 : Diagnosed unrecoverable
    }

    state pickStrategy {
        direction TB
        NonRetryable : Blocked failure reasons
        LlmChoice : Gemini recommendation
        Matrix : Strategy matrix fallback
    }

    state execute {
        direction TB
        Link : Razorpay payment link
        Invoice : Razorpay invoice
        Order : Razorpay order retry
        Recorded : Reminder / escalation (recorded only)
    }

    state simulateResponse {
        direction TB
        ApiFail : API failure becomes failed
        Modelled : Model customer response from SIMULATION_RATES
    }

    state updateState {
        direction TB
        WriteTxn : Update transaction status
        WriteAudit : Insert recovery_actions row
    }

    detect --> calculateRiskScore
    calculateRiskScore --> diagnose
    diagnose --> checkGuardrails

    checkGuardrails --> pickStrategy : allowed
    checkGuardrails --> updateState : blocked

    pickStrategy --> execute
    execute --> simulateResponse
    simulateResponse --> updateState
    updateState --> [*]
```

> The `checkGuardrails → updateState` edge is the only branch in the graph. A blocked transaction skips strategy selection and execution entirely and lands in a terminal status (`unrecoverable`).

---

## 🔁 Sequence Diagram — One Transaction's Lifecycle

This traces a **single failed payment** end-to-end — from the initial webhook through AI analysis to either a dispatched recovery or a safely blocked attempt.

```mermaid
sequenceDiagram
    autonumber
    actor Cust as Customer
    participant RZP as Razorpay
    participant API as Webhook API
    participant DB as PostgreSQL
    participant Cron as Scheduler
    participant Agent as LangGraph Agent
    participant Gemini as Gemini
    participant Sim as Outcome Model

    Cust->>RZP: Attempts payment
    RZP--xCust: Payment declined
    RZP->>API: webhook: payment.failed
    API->>API: Verify signature (HMAC over raw bytes)
    API->>DB: Claim event id (dedupe)
    API->>DB: INSERT transaction (status: failed)
    API-->>RZP: 200 OK
    API->>Agent: Invoke graph (fire and forget)

    Note over Cron,Agent: Runs on the configured Auto-Pilot interval
    Cron->>Agent: Trigger batch recovery run
    Agent->>DB: SELECT recoverable transactions
    DB-->>Agent: Transaction + attempt history

    Agent->>Agent: detect → calculateRiskScore
    Agent->>Gemini: Structured diagnosis (root cause, action, channel)
    Gemini-->>Agent: Diagnosis JSON

    Agent->>Agent: checkGuardrails (max attempts, unrecoverable)

    alt Guardrails fail
        Agent->>DB: UPDATE status = 'unrecoverable'
        Note right of Agent: Terminal — never re-selected
    else Guardrails pass
        Agent->>Agent: pickStrategy
        opt Action needs a Razorpay entity
            Agent->>RZP: POST /v1/payment_links · /invoices · /orders
            RZP-->>Agent: Entity id + short_url
        end
        Agent->>Sim: Model whether the customer pays
        Sim-->>Agent: paid / ignored / failed_again
        Agent->>DB: UPDATE status + INSERT recovery_actions
    end

    Note over Cust,RZP: payment.captured is not yet handled
    Note over Cust,RZP: So a real payment does not auto-flip the row to recovered
```

> The `alt` / `opt` blocks mirror the guardrail branch and the "does this action need a Razorpay entity?" decision from the state diagram above — this view just shows the same logic as a chronological, cross-service conversation.

---

## 📂 Project Structure

The project is structured as a monorepo containing both the React frontend and the Node.js backend.

```text
razorpay-revenue-recovery/
├── client/                      # Frontend React application (Vite)
│   ├── public/                  # Static assets (favicons, etc.)
│   ├── src/
│   │   ├── components/          # RecoverBot, GlassDropdown, PageTransition
│   │   ├── context/             # RecoveryContext (SSE + job state), ToastContext
│   │   ├── pages/               # Landing, Dashboard, Transactions, RecoveryRun, AuditTrail
│   │   ├── utils/               # api.js — endpoint client + auth headers
│   │   ├── App.jsx              # Router + provider stack (Toast > Recovery)
│   │   └── index.css            # Tailwind v4 entry + @theme design tokens
│   └── vercel.json              # Vercel rewrite rules for SPA routing
│
├── server/                      # Backend Node.js application (Express)
│   ├── config/
│   │   ├── gemini.js            # LLM instances, key rotation, structured output
│   │   ├── razorpay.js          # Razorpay SDK client
│   │   ├── constants.js         # Guardrails, statuses, strategy matrix, rates
│   │   └── notifyPolicy.js      # Whether a real SMS/email may be sent
│   ├── db/
│   │   ├── connection.js        # PostgreSQL pooling (pg)
│   │   ├── setup.js             # Table creation script
│   │   ├── migrate.js           # Incremental migrations (webhook_events, run source)
│   │   └── seed.js              # Mock data seeder
│   ├── graph/
│   │   ├── recoveryGraph.js     # StateGraph wiring — 8 nodes, 1 conditional edge
│   │   ├── state.js             # Annotation.Root state channels
│   │   └── nodes/               # detect, riskScore, diagnose, checkGuardrails,
│   │                            #   pickStrategy, execute, simulateResponse, updateState
│   ├── middleware/
│   │   ├── auth.js              # Shared-secret API key (header or query param)
│   │   └── rateLimit.js         # Dependency-free fixed-window limiter
│   ├── routes/                  # transactions, recovery, metrics, audit, export, chat, webhooks
│   ├── services/
│   │   ├── jobManager.js        # In-memory job store + SSE fan-out with replay
│   │   ├── scheduler.js         # node-cron Auto-Pilot + /status, /toggle, /trigger
│   │   ├── runRecord.js         # Ad-hoc recovery_runs rows (webhook / chat)
│   │   └── readOnlySql.js       # Guarded read-only SQL for the chat tool
│   ├── index.js                 # Express server entry point
│   └── .env                     # Environment variables (Backend)
│
└── package.json                 # Root scripts: dev, server, client, init, seed
```

---

## 🚀 Tech Stack

### 🖥️ Frontend
- **React 19** (Vite 8)
- **Routing:** React Router v7
- **Styling:** Tailwind CSS v4 — `@theme` design tokens plus custom CSS layers for the glassmorphic aesthetic
- **Charts:** Recharts 3 (area, bar, donut)
- **Graph Visualization:** `@xyflow/react` v12 (React Flow)
- **Animation:** Framer Motion
- **Markdown:** `react-markdown` + `remark-gfm` (RecoverBot responses)
- **Icons:** Lucide React
- **Hosting:** Vercel

### ⚙️ Backend
- **Node.js + Express 5**
- **Database:** PostgreSQL (hosted on Supabase) via `pg` connection pooling
- **AI Framework:** LangChain / LangGraph JS (`@langchain/langgraph`)
- **LLM:** `gemini-3.5-flash` via `@langchain/google-genai`, with multi-key rotation and structured-output fallbacks
- **Scheduling:** `node-cron`
- **Validation:** `zod` (LLM tool + diagnosis schemas)
- **Integrations:** Razorpay API (payment links, invoices, orders, webhooks)
- **Security:** Shared-secret API key, CORS allowlist, dependency-free fixed-window rate limiting
- **Hosting:** Render

---

## 🔌 API Reference

A quick reference for the backend endpoints exposed by the Express server:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/health` | Uptime probe. Unauthenticated by design. |
| `GET`  | `/api/metrics` | Aggregate dashboard metrics — at-risk revenue, recovery rate, by-type / by-reason / by-action breakdowns, 14-day trend, and funnel data. |
| `GET`  | `/api/audit/:transactionId` | Full audit trail for one transaction: the row plus its parsed `recovery_actions` timeline. |
| `GET`  | `/api/transactions` | Tracked transactions, with server-side `status`, `type`, and `search` filters. |
| `GET`  | `/api/transactions/summary` | Counts and totals grouped by status and by type. |
| `GET`  | `/api/transactions/:id` | A single transaction by id. |
| `POST` | `/api/transactions/mock` | Injects a mock failed transaction — powers the "Add Live Test" modal. |
| `GET`  | `/api/export/csv` | Full recovery ledger as a CSV download. |
| `POST` | `/api/recovery/start` | Starts a background batch run. Returns `{ runId, totalTransactions }`; `409` if a run is already in flight. |
| `GET`  | `/api/recovery/stream/:runId` | **SSE** stream of live agent logs. `?lastIndex=N` replays missed events on reconnect. |
| `GET`  | `/api/recovery/status/:runId` | JSON job status — the polling fallback when SSE drops. |
| `GET`  | `/api/recovery/latest` | The most recent job, used to re-attach after a page refresh. |
| `GET`  | `/api/recovery/runs` | All past recovery runs. |
| `POST` | `/api/chat` | **SSE** stream for RecoverBot — token deltas plus `tool_start` / `tool_end` events. |
| `GET`  | `/api/scheduler/status` | Auto-Pilot state: `enabled`, `intervalHours`, `nextRunTime`, `lastRunStats`. |
| `POST` | `/api/scheduler/toggle` | Enables/disables Auto-Pilot and sets the interval — `{ enable, interval }`. |
| `POST` | `/api/scheduler/trigger` | Forces a run now. Server-side only — no client caller yet. |
| `POST` | `/api/webhooks/razorpay` | Razorpay webhook receiver (`payment.failed`). Authenticated by HMAC signature, not the API key. No client caller — it's called by Razorpay. |

> **Authentication.** Mutating and PII endpoints (`/api/transactions`, `/api/export`, `/api/recovery`, `/api/chat`, `/api/scheduler`) require the shared secret, sent as either an `x-api-key` header or an `?api_key=` query param — the query form exists because `EventSource` and browser downloads can't set headers. `/api/metrics`, `/api/audit`, and `/api/health` stay open so the demo dashboard loads.
>
> **Rate limits.** 15 req/min on `/api/chat`, 10 req/min on `/api/recovery` and `/api/scheduler`, 240 req/min on read endpoints. All fixed-window, in-memory.
>
> ℹ️ For full request/response schemas, see the route handlers in `server/routes/`.

---

## 🛠️ Local Development Setup

### 1. Prerequisites
- Node.js v20.19+ (or v22.12+) — Vite 8 requires `^20.19.0 || >=22.12.0`
- A Razorpay Test Mode account
- A Supabase Project (PostgreSQL)
- A Google Gemini API Key

### 2. Clone the Repository
```bash
git clone https://github.com/yourusername/razorpay-revenue-recovery.git
cd razorpay-revenue-recovery
```

### 3. Install Dependencies
```bash
# Root tooling (concurrently, used by the combined dev script)
npm install

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 4. Environment Variables

Create a `.env` file inside the `server/` folder:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase PostgreSQL connection string |
| `RAZORPAY_KEY_ID` | Razorpay test/live key ID |
| `RAZORPAY_KEY_SECRET` | Razorpay test/live key secret |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signing secret. **Required** — `/api/webhooks/razorpay` rejects every request without it. |
| `GEMINI_API_KEY` | Google Gemini API key. Comma-separate several to rotate between them. |
| `GEMINI_MODEL` | Optional. Overrides the LLM (default `gemini-3.5-flash`). |
| `API_KEY` | Shared secret for protected routes. Unset in dev = open with a warning; unset in production = `503`. |
| `ALLOWED_ORIGINS` | Comma-separated browser origins allowed by CORS. |
| `NOTIFY_CUSTOMERS` | `true` to actually SMS/email customers. **Defaults off** — see below. |
| `NOTIFY_ALLOWLIST` | Optional comma list limiting who may be notified outside production. |
| `RATE_LIMIT_DISABLED` | Set `true` to disable rate limiting during local load testing. |
| `SQL_TOOL_TIMEOUT_MS` | Statement timeout for the chatbot's read-only SQL tool (default `3000`). |
| `PORT` | Backend server port (default `3001`) |
| `NODE_ENV` | `development` or `production` |

```env
DATABASE_URL="postgres://postgres.xxxxx:password@aws-0-region.pooler.supabase.com:6543/postgres"
RAZORPAY_KEY_ID="rzp_test_xxxxxx"
RAZORPAY_KEY_SECRET="xxxxxxxxxxxx"
RAZORPAY_WEBHOOK_SECRET="your_webhook_secret"
GEMINI_API_KEY="AIzaSy..."
API_KEY="a-long-random-shared-secret"
ALLOWED_ORIGINS="http://localhost:5173"
NOTIFY_CUSTOMERS=false
PORT=3001
NODE_ENV="development"
```

Create a `.env` file inside the `client/` folder:

```env
# Points the React app to the backend. Leave unset for local dev — Vite proxies /api to :3001.
# VITE_API_URL="https://your-backend.onrender.com"

# Must match the server's API_KEY. Compiled into the JS bundle, so treat it as a
# drive-by shield rather than real authentication.
VITE_API_KEY="a-long-random-shared-secret"
```

> ⚠️ `NOTIFY_CUSTOMERS` is off by default because the seeded demo data contains fabricated contacts. Runs still create **real** Razorpay payment links and invoices — they just don't push SMS/email at anyone. Leave it `false` unless you own every address in your database.

### 5. Initialize the Database
Run the init script from the **repository root** to create the PostgreSQL tables and seed them with realistic test data.
```bash
npm run init
```

> `npm run init` runs `setup-db` (create tables) followed by `seed`. Run `npm run setup-db` on its own, or `node db/migrate.js` from `server/`, to apply incremental migrations to an existing database.

### 6. Start the Servers

**Both at once** (from the repository root):
```bash
npm run dev
```

**Or in two terminals:**

**Terminal 1 (Backend):**
```bash
npm run server
```

**Terminal 2 (Frontend):**
```bash
npm run client
```

| Service | URL |
|---|---|
| Backend  | `http://localhost:3001` |
| Frontend | `http://localhost:5173` |

> All four scripts (`dev`, `server`, `client`, `init`) live in the **root** `package.json`. `server/package.json` carries only a placeholder `test` script, so `cd server && npm run dev` will not work — run these from the repository root.

---

## 🗺️ Roadmap

- [ ] Handle `payment.captured` webhooks to close the loop with real payments
- [ ] Replace the modelled outcome with real payment confirmation
- [ ] SMS / WhatsApp recovery channel alongside email
- [ ] Configurable guardrail thresholds from the dashboard
- [ ] A/B testing for recovery email templates
- [ ] Multi-currency support for international merchants
- [ ] Webhook signature verification dashboard & audit log

---

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please open an issue first for major changes to discuss what you'd like to change.

---

## 📜 License

This project is licensed under the MIT License.

<div align="center">
  <sub>Built with ❤️ for merchants losing revenue to preventable payment failures.</sub>
</div>
