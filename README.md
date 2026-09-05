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
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 📖 Overview

**Clawback** is a powerful, autonomous revenue recovery platform designed specifically for the Razorpay ecosystem. It continuously monitors Razorpay webhooks for failed transactions — abandoned checkouts, card declines, insufficient funds, timeouts — and turns them into recoverable revenue instead of write-offs.

Instead of treating every failure the same way, Clawback uses a **LangGraph + Google Gemini AI agent** to categorize the failure, evaluate the customer's intent, and autonomously execute the best recovery strategy — such as generating a fresh payment link and dispatching a highly personalized email reminder via Resend.

> 💡 **In short:** a failed payment comes in → the AI decides if it's safe and worth recovering → if so, it acts on its own, end to end, with no manual intervention required.

---

## ✨ Key Features

| | |
|---|---|
| 🧠 **Cognitive AI Recovery** | Understands *why* a payment failed and writes context-aware emails (e.g., suggesting a different card for `insufficient_funds`). |
| 🛡️ **Intelligent Guardrails** | Automatically blocks recovery attempts on high-risk failures (suspected fraud, stolen cards) to protect merchant account standing. |
| ⚡ **Autonomous Execution** | Generates Razorpay Payment Links and sends recovery emails via Resend — no manual intervention needed. |
| 📊 **Glassmorphism Dashboard** | A premium, dark-mode React dashboard for monitoring at-risk revenue, live agent logs, and manual overrides. |
| 🔄 **Full Loop Tracking** | Listens for `payment.captured` webhooks to automatically mark revenue as successfully recovered. |

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

---

## 🏗️ System Architecture & Data Pipeline

Clawback is built on a modern, decoupled event-driven architecture designed to securely ingest financial webhooks, process them asynchronously, and execute AI-driven recovery loops.

```mermaid
flowchart TB
    Customer([" 🙍 Customer "])
    RZP{{" 💳 Razorpay\nAPI & Webhooks "}}
    Resend{{" ✉️ Resend\nEmail API "}}

    subgraph ClientLayer[" 💻 CLIENT — Vercel "]
        direction TB
        UI["React / Vite Dashboard"]
        Charts["Analytics & Live Agent Logs"]
        UI --- Charts
    end

    subgraph ServerLayer[" ⚙️ SERVER — Render "]
        direction TB
        WebhookAPI["🔌 Webhook Receiver\n/api/webhooks"]
        Verify{{"Verify\nSignature"}}
        Scheduler["⏱️ Cron Scheduler"]
        AgentEngine["🧠 LangGraph\nAgent Engine"]
        LinkGen["🔗 Payment Link\nGenerator"]
        EmailGen["📧 Email\nGenerator"]
    end

    subgraph DataLayer[" 🐘 DATABASE — Supabase "]
        DB[("PostgreSQL\ntransactions · metrics")]
    end

    Customer == "1️⃣ Payment fails" ==> RZP
    RZP -- "2️⃣ payment.failed webhook" --> WebhookAPI
    WebhookAPI --> Verify
    Verify -- "✅ valid" --> DB
    Verify -. "❌ invalid → 401" .-> WebhookAPI

    Scheduler == "3️⃣ trigger recovery run" ==> AgentEngine
    DB -. "fetch abandoned txns" .-> AgentEngine

    AgentEngine -- "4️⃣ safe + recoverable" --> LinkGen
    AgentEngine -. "🛑 blocked by guardrails" .-> DB
    LinkGen -- "create payment link" --> RZP
    RZP -. "returns checkout URL" .-> LinkGen
    LinkGen --> EmailGen
    AgentEngine -- "email-only strategy" --> EmailGen

    EmailGen == "5️⃣ dispatch" ==> Resend
    Resend -- "recovery email" --> Customer
    Customer -. "6️⃣ completes payment" .-> RZP
    RZP -. "payment.captured webhook" .-> WebhookAPI

    DB == "live analytics" ==> UI

    classDef actor fill:#1a202c,stroke:#4a5568,color:#f7fafc,font-weight:bold
    classDef client fill:#2b6cb0,stroke:#1a4971,color:#fff,font-weight:bold
    classDef server fill:#276749,stroke:#1c4532,color:#fff,font-weight:bold
    classDef gate fill:#975a16,stroke:#7b341e,color:#fff,font-weight:bold
    classDef data fill:#742a2a,stroke:#521b1b,color:#fff,font-weight:bold

    class Customer,RZP,Resend actor
    class UI,Charts client
    class WebhookAPI,Scheduler,AgentEngine,LinkGen,EmailGen server
    class Verify gate
    class DB data

    style ClientLayer fill:#0f1a2e,stroke:#2b6cb0,stroke-width:1px,color:#fff
    style ServerLayer fill:#0f2419,stroke:#276749,stroke-width:1px,color:#fff
    style DataLayer fill:#2e1414,stroke:#742a2a,stroke-width:1px,color:#fff
```

> Numbered arrows (`1️⃣ → 6️⃣`) trace the happy path from a failed payment to a recovered one; dotted arrows show async/fallback paths (guardrail blocks, invalid signatures, capture confirmation).

---

## 🤖 LangGraph AI Recovery Pipeline

The core intelligence of Clawback is powered by a **LangGraph State Machine** using Google Gemini. Instead of rigid if/else statements, the agent autonomously navigates a graph of tools to recover revenue safely.

```mermaid
stateDiagram-v2
    [*] --> InitializeState : Cron Trigger

    state InitializeState {
        direction LR
        FetchTxn[Fetch Transaction] --> LoadHistory[Load Customer History]
    }

    InitializeState --> GuardrailsNode

    state GuardrailsNode {
        direction TB
        CheckFraud[Fraud Check]
        CheckLimits[Retry Limits]
        CheckDNC[Do Not Contact List]
    }

    GuardrailsNode --> DecisionNode : Passes Guardrails
    GuardrailsNode --> [*] : Fails (Mark Unrecoverable)

    state DecisionNode {
        AnalyzeIntent[Gemini: Analyze Failure Intent]
    }

    DecisionNode --> GenerateLinkNode : Action = Generate Link
    DecisionNode --> DraftEmailNode : Action = Email Only

    GenerateLinkNode --> DraftEmailNode : Append Link to Context

    state DraftEmailNode {
        GeminiDraft[Gemini: Draft Contextual Email]
    }

    DraftEmailNode --> DispatchNode

    state DispatchNode {
        SendEmail[Trigger Resend API]
        UpdateDB[Update Txn Status]
    }

    DispatchNode --> [*] : End Recovery Run
```

---

## 🔁 Sequence Diagram — One Transaction's Lifecycle

This traces a **single failed payment** end-to-end — from the initial webhook through AI analysis to either a recovered sale or a safely blocked attempt.

```mermaid
sequenceDiagram
    autonumber
    actor Cust as 🙍 Customer
    participant RZP as 💳 Razorpay
    participant API as 🔌 Webhook API
    participant DB as 🐘 PostgreSQL
    participant Cron as ⏱️ Scheduler
    participant Agent as 🧠 LangGraph Agent
    participant Gemini as ✨ Gemini
    participant Pay as 🔗 Payment Service
    participant Mail as ✉️ Resend

    Cust->>RZP: Attempts payment
    RZP--xCust: Payment declined
    RZP->>API: webhook: payment.failed
    API->>API: Verify signature
    API->>DB: INSERT transaction (status: failed)
    API-->>RZP: 200 OK

    Note over Cron,Agent: Runs on a fixed interval
    Cron->>Agent: Trigger recovery run
    Agent->>DB: SELECT abandoned transactions
    DB-->>Agent: Transaction + customer history

    Agent->>Agent: Run guardrails (fraud, retry limit, DNC list)

    alt Guardrails fail
        Agent->>DB: UPDATE status = 'unrecoverable'
        Note right of Agent: Run ends — customer never contacted
    else Guardrails pass
        Agent->>Gemini: Classify failure reason + intent
        Gemini-->>Agent: Strategy: link + email / email only

        opt Strategy needs a fresh link
            Agent->>Pay: Create payment link
            Pay->>RZP: POST /payment_links
            RZP-->>Pay: Checkout URL
            Pay-->>Agent: Link created
        end

        Agent->>Gemini: Draft personalized recovery email
        Gemini-->>Agent: Email subject + body

        Agent->>Mail: Send recovery email
        Mail->>Cust: 📩 "Complete your payment"
        Agent->>DB: UPDATE status = 'recovery_sent'

        Cust->>RZP: Clicks link, completes payment
        RZP->>API: webhook: payment.captured
        API->>DB: UPDATE status = 'recovered'
    end
```

> The `alt` / `opt` blocks mirror the guardrail branch and the "link vs. email-only" decision from the state diagram above — this view just shows the same logic as a chronological, cross-service conversation.

---

## 📂 Project Structure

The project is structured as a monorepo containing both the React frontend and the Node.js backend.

```text
razorpay-revenue-recovery/
├── client/                      # Frontend React application (Vite)
│   ├── public/                  # Static assets (favicons, etc.)
│   ├── src/
│   │   ├── components/          # Reusable UI components (Sidebar, Navbar, Badges)
│   │   ├── context/              # React Context providers (RecoveryContext)
│   │   ├── pages/                # Main dashboard views (Dashboard, Transactions)
│   │   ├── utils/                 # API helpers and formatting utilities
│   │   ├── App.jsx               # Main React router setup
│   │   └── index.css             # Global CSS (Glassmorphism design system)
│   └── vercel.json               # Vercel rewrite rules for SPA routing
│
├── server/                      # Backend Node.js application (Express)
│   ├── db/
│   │   ├── connection.js        # Supabase PostgreSQL pooling
│   │   ├── setup.js             # Database table creation script
│   │   └── seed.js              # Mock data seeder
│   ├── graph/
│   │   ├── agent.js             # Core LangGraph AI execution flow
│   │   └── nodes/               # Individual agent steps (guardrails, generation)
│   ├── routes/                  # Express API endpoints
│   ├── services/
│   │   ├── emailService.js      # Resend integration
│   │   ├── paymentService.js    # Razorpay Payment Link generation
│   │   └── scheduler.js         # Cron job for automated recovery runs
│   ├── index.js                 # Express server entry point
│   └── .env                     # Environment variables (Backend)
```

---

## 🚀 Tech Stack

### 🖥️ Frontend
- **React 18** (Vite)
- **CSS:** Vanilla CSS with custom CSS variables, flexbox/grid, and backdrop-filters for a glassmorphic aesthetic
- **Icons:** Lucide React
- **Hosting:** Vercel

### ⚙️ Backend
- **Node.js + Express**
- **Database:** PostgreSQL (hosted on Supabase) with `pg` connection pooling
- **AI Framework:** LangChain / LangGraph JS
- **LLM:** Google Gemini 1.5 Pro / Flash
- **Integrations:** Razorpay API, Resend Email API
- **Hosting:** Render

---

## 🔌 API Reference

A quick reference for the core backend endpoints exposed by the Express server:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/transactions` | Returns the list of tracked transactions (failed, recovered, unrecoverable) with filtering support. |
| `GET`  | `/api/metrics` | Returns aggregate dashboard metrics — at-risk revenue, recovery rate, active recovery runs. |
| `POST` | `/api/webhooks` | Receives and verifies incoming Razorpay webhook events (`payment.failed`, `payment.captured`). |

> ℹ️ For full request/response schemas, see the route handlers in `server/routes/`.

---

## 🛠️ Local Development Setup

### 1. Prerequisites
- Node.js (v18 or higher)
- A Razorpay Test Mode account
- A Supabase Project (PostgreSQL)
- A Resend API Key
- A Google Gemini API Key

### 2. Clone the Repository
```bash
git clone https://github.com/yourusername/razorpay-revenue-recovery.git
cd razorpay-revenue-recovery
```

### 3. Install Dependencies
```bash
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
| `GEMINI_API_KEY` | Google Gemini API key |
| `RESEND_API_KEY` | Resend API key for transactional email |
| `PORT` | Backend server port (default `3001`) |
| `NODE_ENV` | `development` or `production` |

```env
DATABASE_URL="postgres://postgres.xxxxx:password@aws-0-region.pooler.supabase.com:6543/postgres"
RAZORPAY_KEY_ID="rzp_test_xxxxxx"
RAZORPAY_KEY_SECRET="xxxxxxxxxxxx"
GEMINI_API_KEY="AIzaSy..."
RESEND_API_KEY="re_xxxxxx"
PORT=3001
NODE_ENV="development"
```

Create a `.env` file inside the `client/` folder:

```env
# Points the React app to the backend
VITE_API_URL="http://localhost:3001"
```

### 5. Initialize the Database
Run the init script from the `server` directory to automatically create the necessary PostgreSQL tables and seed them with realistic test data.
```bash
cd server
npm run init
```

### 6. Start the Servers
You'll need two terminal windows to run the frontend and backend simultaneously.

**Terminal 1 (Backend):**
```bash
cd server
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd client
npm run dev
```

| Service | URL |
|---|---|
| Backend  | `http://localhost:3001` |
| Frontend | `http://localhost:5173` |

---

## 🗺️ Roadmap

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

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

<div align="center">
  <sub>Built with ❤️ for merchants losing revenue to preventable payment failures.</sub>
</div>