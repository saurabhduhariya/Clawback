
<div align="center">
  <h1>Clawback — AI Revenue Recovery</h1>
  <p><strong>An autonomous AI agent built to recover lost revenue for Razorpay merchants.</strong></p>
  <p>
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
    <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" />
    <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" />
    <img src="https://img.shields.io/badge/Gemini_AI-8E75B2?style=for-the-badge&logo=googlebard&logoColor=white" />
    <a href="https://clawback-seven.vercel.app/" target="_blank"><img src="https://img.shields.io/badge/Live_Demo-000000?style=for-the-badge&logo=vercel&logoColor=white" /></a>
  </p>
  <img src="./assets/screenshots/hero.png" alt="Clawback Hero" width="100%" style="border-radius: 8px; margin-top: 20px;" />
</div>

---

## 📖 Overview

Clawback is a powerful, autonomous revenue recovery platform designed specifically for the Razorpay ecosystem. It continuously monitors your Razorpay webhooks for failed transactions (e.g., abandoned checkouts, card declines, insufficient funds, timeouts). 

Instead of treating all failures equally, Clawback uses a **LangGraph + Google Gemini AI agent** to categorize failures, evaluate the customer's intent, and autonomously execute the best recovery strategy (such as generating a fresh payment link and dispatching a highly personalized email reminder via Resend).

## ✨ Key Features

* 🧠 **Cognitive AI Recovery:** Understands *why* a payment failed and writes context-aware emails (e.g., suggesting a different card for `insufficient_funds`).
* 🛡️ **Intelligent Guardrails:** Automatically blocks recovery attempts for high-risk failures (e.g., suspected fraud, stolen cards) to protect your merchant account standing.
* ⚡ **Autonomous Execution:** Automatically generates Razorpay Payment Links and sends emails via Resend without manual intervention.
* 📊 **Glassmorphism Dashboard:** A premium, dark-mode React dashboard to monitor at-risk revenue, observe real-time agent logs, and manually override decisions.
* 🔄 **Full Loop Tracking:** Listens for `payment.captured` webhooks to automatically mark revenue as successfully recovered.

---

## 📸 Dashboard & Interface

<div align="center">
  <img src="./assets/screenshots/landing.png" alt="Clawback Home" width="49%" style="border-radius: 8px; margin-bottom: 10px;" />
  <img src="./assets/screenshots/dashboard.png" alt="Clawback Dashboard Analytics" width="49%" style="border-radius: 8px; margin-bottom: 10px;" />
</div>
<div align="center">
  <img src="./assets/screenshots/transactions.png" alt="Recovery Transactions Ledger" width="49%" style="border-radius: 8px;" />
  <img src="./assets/screenshots/pipeline.png" alt="LangGraph AI Pipeline" width="49%" style="border-radius: 8px;" />
</div>

---

## 🏗️ System Architecture & Data Pipeline

Clawback is built on a modern, decoupled event-driven architecture. The system is designed to securely ingest financial webhooks, process them asynchronously, and execute AI-driven recovery loops.

```mermaid
flowchart TB
    %% External Systems
    subgraph External["External Ecosystem"]
        direction TB
        Customer([🙍‍♂️ Customer])
        RZP{{💳 Razorpay API & Webhooks}}
        Resend{{✉️ Resend API}}
    end

    %% Frontend
    subgraph Frontend["Client (Vercel)"]
        UI[💻 React / Vite Dashboard]
    end

    %% Backend Services
    subgraph Backend["Server (Render)"]
        direction TB
        WebhookAPI[🔌 Webhook Receiver]
        Scheduler[⏱️ Cron Scheduler]
        AgentEngine[🧠 LangGraph Agent Engine]
        EmailGen[📧 Email Generator]
        LinkGen[🔗 Payment Link Generator]
    end

    %% Database
    subgraph Database["Database (Supabase)"]
        DB[(🐘 PostgreSQL)]
    end

    %% Connections
    Customer -- "Payment Fails" --> RZP
    RZP -- "payment.failed" --> WebhookAPI
    WebhookAPI -- "Store Transaction" --> DB
    
    Scheduler -- "Trigger Recovery Run" --> AgentEngine
    DB -. "Fetch Abandoned Txns" .-> AgentEngine
    
    AgentEngine -- "Generate Recovery Strategy" --> EmailGen
    AgentEngine -- "Create Link" --> LinkGen
    LinkGen -- "API Call" --> RZP
    RZP -. "Returns URL" .-> LinkGen
    
    EmailGen --> Resend
    Resend -- "Sends Recovery Email" --> Customer
    
    UI -- "Fetch Live Analytics" --> DB
    
    classDef external fill:#2d3748,stroke:#4a5568,color:#fff
    classDef frontend fill:#2b6cb0,stroke:#2c5282,color:#fff
    classDef backend fill:#276749,stroke:#22543d,color:#fff
    classDef database fill:#742a2a,stroke:#63171b,color:#fff
    
    class Customer,RZP,Resend external
    class UI frontend
    class WebhookAPI,Scheduler,AgentEngine,EmailGen,LinkGen backend
    class DB database
```

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

## 📂 Project Structure

The project is structured as a monorepo containing both the React frontend and the Node.js backend.

```text
razorpay-revenue-recovery/
├── client/                      # Frontend React application (Vite)
│   ├── public/                  # Static assets (favicons, etc.)
│   ├── src/
│   │   ├── components/          # Reusable UI components (Sidebar, Navbar, Badges)
│   │   ├── context/             # React Context providers (RecoveryContext)
│   │   ├── pages/               # Main dashboard views (Dashboard, Transactions)
│   │   ├── utils/               # API helpers and formatting utilities
│   │   ├── App.jsx              # Main React router setup
│   │   └── index.css            # Global CSS (Glassmorphism design system)
│   └── vercel.json              # Vercel rewrite rules for SPA routing
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
* **React 18** (Vite)
* **CSS:** Vanilla CSS with custom CSS variables, flexbox/grid, and backdrop-filters for a glassmorphic aesthetic.
* **Icons:** Lucide React
* **Hosting:** Vercel

### ⚙️ Backend
* **Node.js + Express**
* **Database:** PostgreSQL (Hosted on Supabase) with `pg` connection pooling.
* **AI Framework:** LangChain / LangGraph JS
* **LLM:** Google Gemini 1.5 Pro / Flash
* **Integrations:** Razorpay API, Resend Email API
* **Hosting:** Render

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
Create a `.env` file inside the `server/` folder with the following variables:
```env
# Supabase PostgreSQL Connection String
DATABASE_URL="postgres://postgres.xxxxx:password@aws-0-region.pooler.supabase.com:6543/postgres"

# Razorpay Test Credentials
RAZORPAY_KEY_ID="rzp_test_xxxxxx"
RAZORPAY_KEY_SECRET="xxxxxxxxxxxx"

# Google Gemini API Key
GEMINI_API_KEY="AIzaSy..."

# Resend API Key
RESEND_API_KEY="re_xxxxxx"

# Server Configuration
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
You will need two terminal windows to run both the frontend and backend simultaneously.

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

Your backend will run on `http://localhost:3001` and your frontend will be accessible at `http://localhost:5173`.

---

## 📜 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
