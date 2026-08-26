const express = require('express');
const router = express.Router();
const llm = require('../config/gemini');
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
      const results = queryAll(query);
      return JSON.stringify(results.slice(0, 50)); // limit to 50 rows
    } catch (err) {
      return `Error executing query: ${err.message}`;
    }
  },
  {
    name: "query_database",
    description: "Executes a SQL SELECT query against the local SQLite database. Use this to analyze transactions, find specific records, or calculate metrics.",
    schema: z.object({
      query: z.string().describe("A valid SQLite SELECT query."),
    }),
  }
);

// Tool 2: Trigger Autonomous Recovery
const triggerRecoveryTool = tool(
  async ({ transactionId }) => {
    try {
      console.log(`[Tool] Triggering recovery for: ${transactionId}`);
      // check if it exists
      const txn = queryAll('SELECT id FROM transactions WHERE id = ?', [transactionId]);
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

const tools = [queryDatabaseTool, triggerRecoveryTool, generatePaymentLinkTool];

const systemMessage = `You are RecoverBot, the AI Finance Co-pilot for Razorpay Revenue Recovery.
You have access to tools that can read the database, trigger autonomous recoveries, and generate payment links.
Always use markdown to format your responses (e.g. bold text, bullet points). Make links clickable.
If you generate a payment link, present it clearly to the user.

Database Schema (SQLite):
- Table: transactions (id, customer_name, customer_email, customer_phone, amount, currency, type, status, failure_reason, failure_source, attempt_count, max_attempts, recovered_amount)
- Table: recovery_runs (id, status, total_transactions, total_at_risk_amount, total_recovered, recovery_rate)
- Table: recovery_actions (id, transaction_id, chosen_action, razorpay_api_called, recovery_result)`;



router.post("/", async (req, res) => {
  try {
    const { message, chat_history = [] } = req.body;
    
    // In a real app, map chat_history to proper LangChain message objects
    // For this hackathon, we'll just pass a minimal history if provided, but let's keep it simple
    
    const formattedHistory = chat_history.map(m => 
      m.role === 'user' ? { role: 'user', content: m.content } : { role: 'assistant', content: m.content }
    );
    
    const agent = createReactAgent({
      llm,
      tools,
      messageModifier: systemMessage,
    });
    
    const result = await agent.invoke({
      messages: [...formattedHistory, { role: 'user', content: message }]
    });

    const reply = result.messages[result.messages.length - 1].content;
    res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
