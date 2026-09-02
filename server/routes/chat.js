const express = require('express');
const router = express.Router();
const { llm } = require('../config/gemini');
const { queryAll, run } = require('../db/connection');
const buildRecoveryGraph = require('../graph/recoveryGraph');
const razorpay = require('../config/razorpay');
const { tool } = require('@langchain/core/tools');
const { z } = require('zod');

const { createReactAgent } = require('@langchain/langgraph/prebuilt');

// Tool 1: SQL Database Query
const queryDatabaseTool = tool(
  async ({ query }) => {
    try {
      console.log(`[Tool] Executing SQL: ${query}`);
      const results = await queryAll(query);
      return JSON.stringify(results.slice(0, 50)); // limit to 50 rows
    } catch (err) {
      return `Error executing query: ${err.message}`;
    }
  },
  {
    name: "query_database",
    description: "Executes a SQL SELECT query against the PostgreSQL database. Use this to analyze transactions, find specific records, or calculate metrics.",
    schema: z.object({
      query: z.string().describe("A valid PostgreSQL SELECT query."),
    }),
  }
);

// Tool 2: Trigger Autonomous Recovery
const triggerRecoveryTool = tool(
  async ({ transactionId }) => {
    try {
      console.log(`[Tool] Triggering recovery for: ${transactionId}`);
      // check if it exists
      const txn = await queryAll('SELECT id FROM transactions WHERE id = ?', [transactionId]);
      if (txn.length === 0) return `Error: Transaction ${transactionId} not found.`;
      
      const graph = buildRecoveryGraph();
      const result = await graph.invoke({ transactionId, runId: 0 });
      return `Recovery pipeline triggered. Chosen action: ${result.chosenAction}. Result: ${result.recoveryResult}`;
    } catch (err) {
      return `Error triggering recovery: ${err.message}`;
    }
  },
  {
    name: "trigger_recovery",
    description: "Triggers the autonomous LangGraph recovery pipeline for a specific transaction ID.",
    schema: z.object({
      transactionId: z.string().describe("The ID of the failed transaction (e.g., pay_12345)."),
    }),
  }
);

// Tool 3: Generate Razorpay Payment Link
const generatePaymentLinkTool = tool(
  async ({ amount, email, name, description }) => {
    try {
      console.log(`[Tool] Generating link for ${amount} INR to ${email}`);
      const result = await razorpay.paymentLink.create({
        amount: amount * 100, // convert to paise
        currency: "INR",
        description: description || "Payment Recovery",
        customer: { name: name || "Customer", email },
        notify: { sms: false, email: false },
      });
      return `Payment link created successfully! URL: ${result.short_url}`;
    } catch (err) {
      return `Error creating payment link: ${err.message}`;
    }
  },
  {
    name: "generate_payment_link",
    description: "Directly creates a new Razorpay payment link. Use this if the user asks to create a link manually.",
    schema: z.object({
      amount: z.number().describe("The amount in INR (whole number)."),
      email: z.string().describe("Customer's email address."),
      name: z.string().optional().describe("Customer's name."),
      description: z.string().optional().describe("Description of the payment."),
    }),
  }
);

// Tool 1: Get Dashboard Metrics
const getDashboardMetricsTool = tool(
  async () => {
    try {
      console.log(`[Tool] Fetching dashboard metrics`);
      const totalTxns = await queryAll('SELECT COUNT(*) as count, SUM(amount) as total_amount FROM transactions');
      const recovered = await queryAll('SELECT COUNT(*) as count, SUM(recovered_amount) as recovered_amount FROM transactions WHERE status = \'recovered\'');
      const failed = await queryAll('SELECT COUNT(*) as count FROM transactions WHERE status = \'failed\'');
      
      return JSON.stringify({
        total_transactions: totalTxns[0].count,
        total_at_risk_amount: totalTxns[0].total_amount || 0,
        recovered_transactions: recovered[0].count,
        recovered_amount: recovered[0].recovered_amount || 0,
        currently_failed: failed[0].count
      });
    } catch (err) {
      return `Error executing query: ${err.message}`;
    }
  },
  {
    name: "get_dashboard_metrics",
    description: "Fetches high-level revenue recovery metrics (total at risk, recovered amount, failure counts) from the database.",
    schema: z.object({}),
  }
);

// Tool 2: Explain Failure
const explainFailureTool = tool(
  async ({ transactionId }) => {
    try {
      console.log(`[Tool] Explaining failure for ${transactionId}`);
      const txn = await queryAll('SELECT * FROM transactions WHERE id = ?', [transactionId]);
      if (txn.length === 0) return `Transaction ${transactionId} not found.`;
      
      const t = txn[0];
      return `Transaction ${t.id} failed due to: ${t.failure_reason}. Source: ${t.failure_source}. Current status: ${t.status}. AI Recommendation: ${t.failure_reason.toLowerCase().includes('insufficient') ? 'Send payment link' : 'Retry payment'}`;
    } catch (err) {
      return `Error fetching transaction: ${err.message}`;
    }
  },
  {
    name: "explain_failure",
    description: "Analyzes a specific transaction ID to explain why it failed and suggest a recovery strategy.",
    schema: z.object({
      transactionId: z.string().describe("The ID of the failed transaction (e.g., pay_12345)."),
    }),
  }
);

const tools = [getDashboardMetricsTool, explainFailureTool, queryDatabaseTool, triggerRecoveryTool, generatePaymentLinkTool];

const systemMessage = `You are RecoverBot, the AI Finance Co-pilot for Razorpay Revenue Recovery.
You have access to tools that can read the database, trigger autonomous recoveries, and generate payment links.
Always use markdown to format your responses (e.g. bold text, bullet points). Make links clickable.
If you generate a payment link, present it clearly to the user.

Database Schema (PostgreSQL):
- Table: transactions (id, customer_name, customer_email, customer_phone, amount, currency, type, status, failure_reason, failure_source, attempt_count, max_attempts, recovered_amount)
- Table: recovery_runs (id, status, total_transactions, total_at_risk_amount, total_recovered, recovery_rate)
- Table: recovery_actions (id, transaction_id, chosen_action, razorpay_api_called, recovery_result)`;



router.post("/", async (req, res) => {
  try {
    const { message, chat_history = [], context = {} } = req.body;
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const formattedHistory = chat_history.map(m => 
      m.role === 'user' ? { role: 'user', content: m.content } : { role: 'assistant', content: m.content }
    );
    
    const agent = createReactAgent({
      llm,
      tools,
      messageModifier: systemMessage + "\n\nUser Context: " + JSON.stringify(context),
    });
    
    const stream = await agent.streamEvents({
      messages: [...formattedHistory, { role: 'user', content: message }]
    }, { version: 'v2' });

    for await (const event of stream) {
      if (event.event === 'on_chat_model_stream') {
        const chunk = event.data.chunk;
        if (chunk && chunk.content && typeof chunk.content === 'string') {
          res.write(`data: ${JSON.stringify({ type: 'content', content: chunk.content })}\n\n`);
        } else if (chunk && Array.isArray(chunk.content)) {
            // handle multimodal array content
            const textPart = chunk.content.find(p => p.type === 'text');
            if (textPart && textPart.text) {
                res.write(`data: ${JSON.stringify({ type: 'content', content: textPart.text })}\n\n`);
            }
        }
      } else if (event.event === 'on_tool_start') {
        res.write(`data: ${JSON.stringify({ type: 'tool_start', name: event.name })}\n\n`);
      } else if (event.event === 'on_tool_end') {
        res.write(`data: ${JSON.stringify({ type: 'tool_end', name: event.name })}\n\n`);
      }
    }
    res.write(`data: [DONE]\n\n`);
    res.end();

  } catch (err) {
    console.error("Chat error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
      res.end();
    }
  }
});

module.exports = router;
