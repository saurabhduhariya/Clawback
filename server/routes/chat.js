const express = require('express');
const router = express.Router();
const { llm } = require('../config/gemini');
const { queryAll, run } = require('../db/connection');
const buildRecoveryGraph = require('../graph/recoveryGraph');
const razorpay = require('../config/razorpay');
const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const { runReadOnlyQuery, MAX_ROWS } = require('../services/readOnlySql');
const { createAdHocRun, completeAdHocRun } = require('../services/runRecord');
const { notifyAllowed } = require('../config/notifyPolicy');

const { createReactAgent } = require('@langchain/langgraph/prebuilt');

// ── TOOL LABEL MAP (for rich frontend tool indicators) ──
const TOOL_LABELS = {
  get_dashboard_metrics: { label: 'Fetching dashboard metrics', icon: 'chart' },
  search_transactions: { label: 'Searching transactions', icon: 'search' },
  explain_failure: { label: 'Analyzing failure reason', icon: 'diagnosis' },
  analyze_failures: { label: 'Running cohort analysis', icon: 'analysis' },
  query_database: { label: 'Querying database', icon: 'database' },
  trigger_recovery: { label: 'Running recovery pipeline', icon: 'recovery' },
  generate_payment_link: { label: 'Creating Razorpay payment link', icon: 'payment' },
};

// ── TOOL 1: Dashboard Metrics ──
const getDashboardMetricsTool = tool(
  async () => {
    try {
      console.log('[Tool] Fetching dashboard metrics');
      const totalTxns = await queryAll('SELECT COUNT(*) as count, SUM(amount) as total_amount FROM transactions');
      const recovered = await queryAll("SELECT COUNT(*) as count, SUM(recovered_amount) as recovered_amount FROM transactions WHERE status = 'recovered'");
      const failed = await queryAll("SELECT COUNT(*) as count FROM transactions WHERE status IN ('failed', 'abandoned', 'overdue')");
      const recoverySent = await queryAll("SELECT COUNT(*) as count FROM transactions WHERE status = 'recovery_sent'");
      const unrecoverable = await queryAll("SELECT COUNT(*) as count FROM transactions WHERE status = 'unrecoverable'");
      
      const totalAtRisk = Number(totalTxns[0].total_amount) || 0;
      const totalRecovered = Number(recovered[0].recovered_amount) || 0;
      const recoveryRate = totalAtRisk > 0 ? ((totalRecovered / totalAtRisk) * 100).toFixed(1) : '0.0';

      return JSON.stringify({
        total_transactions: Number(totalTxns[0].count),
        total_at_risk_amount: totalAtRisk,
        recovery_rate: recoveryRate + '%',
        recovered_transactions: Number(recovered[0].count),
        recovered_amount: totalRecovered,
        currently_failed: Number(failed[0].count),
        recovery_in_progress: Number(recoverySent[0].count),
        unrecoverable: Number(unrecoverable[0].count),
      });
    } catch (err) {
      return 'Error fetching metrics: ' + err.message;
    }
  },
  {
    name: "get_dashboard_metrics",
    description: "Returns high-level revenue recovery KPIs: total at risk, recovered amount/count, recovery rate, failed count, in-progress count, and unrecoverable count.",
    schema: z.object({}),
  }
);

// ── TOOL 2: Search Transactions (SAFE — no raw SQL) ──
const searchTransactionsTool = tool(
  async ({ status, limit, customer_email, min_amount, failure_reason }) => {
    try {
      console.log('[Tool] Searching transactions with filters:', { status, limit, customer_email, min_amount, failure_reason });
      let conditions = [];
      let params = [];
      let paramIndex = 1;
      
      if (status && status !== 'all') {
        conditions.push('status = $' + paramIndex++);
        params.push(status);
      }
      if (customer_email) {
        conditions.push('LOWER(customer_email) = LOWER($' + paramIndex++ + ')');
        params.push(customer_email);
      }
      if (min_amount) {
        conditions.push('amount >= $' + paramIndex++);
        params.push(min_amount);
      }
      if (failure_reason) {
        conditions.push('LOWER(failure_reason) LIKE LOWER($' + paramIndex++ + ')');
        params.push('%' + failure_reason + '%');
      }
      
      const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
      const maxRows = Math.min(limit || 10, 25);
      
      const query = 'SELECT id, customer_name, customer_email, amount, currency, type, status, failure_reason, attempt_count, created_at FROM transactions ' + where + ' ORDER BY created_at DESC LIMIT $' + paramIndex;
      params.push(maxRows);
      
      const { rows } = await require('../db/connection').pool.query(query, params);
      
      if (rows.length === 0) return 'No transactions found matching those filters.';
      return JSON.stringify(rows);
    } catch (err) {
      return 'Error searching transactions: ' + err.message;
    }
  },
  {
    name: "search_transactions",
    description: "Searches transactions with safe filters. Use this instead of writing raw SQL when the user asks to list, find, or show transactions by status, email, amount, or failure reason.",
    schema: z.object({
      status: z.enum(['failed', 'abandoned', 'overdue', 'recovered', 'recovery_sent', 'unrecoverable', 'escalated', 'all']).optional().describe("Filter by transaction status. Use 'all' or omit to show all."),
      limit: z.number().optional().describe("Max number of results (default 10, max 25)."),
      customer_email: z.string().optional().describe("Filter by customer email address."),
      min_amount: z.number().optional().describe("Filter transactions above this amount (in paise)."),
      failure_reason: z.string().optional().describe("Partial match on failure reason text."),
    }),
  }
);

// ── TOOL 3: Explain Failure (with recovery history) ──
const explainFailureTool = tool(
  async ({ transactionId }) => {
    try {
      console.log('[Tool] Explaining failure for ' + transactionId);
      const txn = await queryAll('SELECT * FROM transactions WHERE id = $1', [transactionId]);
      if (txn.length === 0) return 'Transaction ' + transactionId + ' not found. Please provide a valid transaction ID (e.g., pay_12345).';
      
      const t = txn[0];
      const actions = await queryAll(
        'SELECT attempt_number, chosen_action, recovery_result, simulated_outcome, created_at FROM recovery_actions WHERE transaction_id = $1 ORDER BY created_at DESC LIMIT 5',
        [transactionId]
      );
      
      const result = {
        id: t.id,
        customer: t.customer_name + ' (' + t.customer_email + ')',
        amount: '₹' + (t.amount / 100).toLocaleString(),
        type: t.type,
        status: t.status,
        failure_reason: t.failure_reason,
        failure_source: t.failure_source,
        attempts: t.attempt_count + '/' + t.max_attempts,
        recovery_history: actions.length > 0 ? actions : 'No recovery attempts yet.',
      };
      
      return JSON.stringify(result);
    } catch (err) {
      return 'Error fetching transaction: ' + err.message;
    }
  },
  {
    name: "explain_failure",
    description: "Fetches full details of a specific transaction including customer info, failure reason, and all past recovery attempts. Use when the user asks about a specific transaction ID.",
    schema: z.object({
      transactionId: z.string().describe("The transaction ID (e.g., pay_12345)."),
    }),
  }
);

// ── TOOL 4: Analyze Failures (Cohort Analysis) ──
const analyzeFailuresTool = tool(
  async ({ days_back }) => {
    try {
      console.log('[Tool] Analyzing failure cohorts for last ' + days_back + ' days');
      
      const byReason = await queryAll(
        "SELECT failure_reason, COUNT(*) as count, SUM(amount) as total_amount, " +
        "SUM(CASE WHEN status = 'recovered' THEN 1 ELSE 0 END) as recovered " +
        "FROM transactions WHERE created_at >= NOW() - INTERVAL '" + Math.min(days_back || 7, 30) + " days' " +
        "GROUP BY failure_reason ORDER BY count DESC LIMIT 10"
      );
      
      const byType = await queryAll(
        "SELECT type, COUNT(*) as count, SUM(amount) as total_amount, " +
        "SUM(CASE WHEN status = 'recovered' THEN 1 ELSE 0 END) as recovered " +
        "FROM transactions WHERE created_at >= NOW() - INTERVAL '" + Math.min(days_back || 7, 30) + " days' " +
        "GROUP BY type ORDER BY count DESC"
      );
      
      const topCustomers = await queryAll(
        "SELECT customer_email, customer_name, COUNT(*) as failure_count, SUM(amount) as total_amount " +
        "FROM transactions WHERE status IN ('failed', 'abandoned', 'overdue') " +
        "AND created_at >= NOW() - INTERVAL '" + Math.min(days_back || 7, 30) + " days' " +
        "GROUP BY customer_email, customer_name ORDER BY failure_count DESC LIMIT 5"
      );
      
      return JSON.stringify({
        period: 'Last ' + (days_back || 7) + ' days',
        by_failure_reason: byReason,
        by_transaction_type: byType,
        top_repeat_failing_customers: topCustomers,
      });
    } catch (err) {
      return 'Error analyzing failures: ' + err.message;
    }
  },
  {
    name: "analyze_failures",
    description: "Performs a cohort analysis of recent failures grouped by failure reason, transaction type, and top repeat-failing customers. Use when the user asks 'why are payments failing?', 'analyze failures', or 'show failure trends'.",
    schema: z.object({
      days_back: z.number().optional().describe("How many days back to analyze (default 7, max 30)."),
    }),
  }
);

// ── TOOL 5: Raw SQL (read-only, guarded) ──
const queryDatabaseTool = tool(
  async ({ query }) => {
    try {
      console.log('[Tool] Executing SQL: ' + query);
      const { rows } = await runReadOnlyQuery(query);
      return JSON.stringify(rows.slice(0, MAX_ROWS));
    } catch (err) {
      return 'Error executing query: ' + err.message;
    }
  },
  {
    name: "query_database",
    description: "Executes a raw PostgreSQL SELECT query. ONLY use this for advanced analytical queries that cannot be done with search_transactions or analyze_failures. The tool is read-only and will reject any writes.",
    schema: z.object({
      query: z.string().describe("A valid PostgreSQL SELECT query. Must be read-only."),
    }),
  }
);

// ── TOOL 6: Trigger Recovery ──
const triggerRecoveryTool = tool(
  async ({ transactionId }) => {
    try {
      console.log('[Tool] Triggering recovery for: ' + transactionId);
      const txn = await queryAll('SELECT * FROM transactions WHERE id = $1', [transactionId]);
      if (txn.length === 0) return 'Error: Transaction ' + transactionId + ' not found.';
      
      const t = txn[0];
      if (t.status === 'recovered') return 'Transaction ' + transactionId + ' is already recovered! No action needed.';
      if (t.status === 'unrecoverable') return 'Transaction ' + transactionId + ' has been marked as unrecoverable and cannot be retried.';
      if (t.attempt_count >= t.max_attempts) return 'Transaction ' + transactionId + ' has exhausted all ' + t.max_attempts + ' recovery attempts.';
      
      const runId = await createAdHocRun('chat', t.amount);
      const graph = buildRecoveryGraph();
      const result = await graph.invoke({ transactionId, runId: runId || 0 });
      if (runId) await completeAdHocRun(runId, { recovered: result.recoveryResult === 'success' ? t.amount : 0 });
      
      // Pre-format the response so the LLM doesn't dump raw JSON
      const diag = result.diagnosis || {};
      const shortUrl = result.razorpayResponse?.short_url || null;
      let summary = 'Recovery pipeline completed for ' + transactionId + '.\n';
      summary += '- Root Cause: ' + (diag.root_cause || 'Unknown') + '\n';
      summary += '- Retryable: ' + (diag.is_retryable ? 'Yes' : 'No') + '\n';
      summary += '- Action Taken: ' + (result.chosenAction || 'none').replace(/_/g, ' ') + '\n';
      summary += '- Result: ' + (result.recoveryResult || 'unknown') + '\n';
      if (shortUrl) summary += '- Payment Link: ' + shortUrl + '\n';
      if (diag.customer_message) summary += '- Customer Message: ' + diag.customer_message + '\n';
      return summary;
    } catch (err) {
      return 'Error triggering recovery: ' + err.message;
    }
  },
  {
    name: "trigger_recovery",
    description: "Triggers the full AI recovery pipeline for a specific transaction. Only use when the user explicitly asks to recover a transaction.",
    schema: z.object({
      transactionId: z.string().describe("The ID of the failed transaction (e.g., pay_12345)."),
    }),
  }
);

// ── TOOL 7: Generate Payment Link ──
const generatePaymentLinkTool = tool(
  async ({ amount, email, name, description }) => {
    try {
      console.log('[Tool] Generating link for ' + amount + ' INR to ' + email);
      const mayNotify = notifyAllowed({ email });
      const result = await razorpay.paymentLink.create({
        amount: amount * 100,
        currency: "INR",
        description: description || "Payment Recovery",
        customer: { name: name || "Customer", email },
        notify: { sms: mayNotify, email: mayNotify },
      });
      return JSON.stringify({
        status: 'Payment link created',
        url: result.short_url,
        amount: '₹' + amount,
        customer: email,
      });
    } catch (err) {
      return 'Error creating payment link: ' + err.message;
    }
  },
  {
    name: "generate_payment_link",
    description: "Creates a Razorpay payment link and returns the checkout URL. Use when the user asks to create a payment link manually.",
    schema: z.object({
      amount: z.number().describe("The amount in INR (whole number, e.g., 499 for ₹499)."),
      email: z.string().describe("Customer's email address."),
      name: z.string().optional().describe("Customer's name."),
      description: z.string().optional().describe("Payment description."),
    }),
  }
);

const tools = [getDashboardMetricsTool, searchTransactionsTool, explainFailureTool, analyzeFailuresTool, queryDatabaseTool, triggerRecoveryTool, generatePaymentLinkTool];

const systemMessage = `You are **RecoverBot**, the AI Finance Co-pilot for Clawback — an autonomous revenue recovery system built on Razorpay.

## Your Personality
- You are professional, concise, and data-driven.
- Format all responses in clean markdown: use **bold**, bullet points, tables, and code blocks.
- Show currency as ₹ with comma formatting (e.g., ₹4,999).
- When presenting data, prefer tables over raw JSON.
- When you create a payment link, present it prominently with the URL.

## Decision Guidelines
1. **For metrics/stats questions** (e.g., "what's our recovery rate?", "show me numbers") → use \`get_dashboard_metrics\`.
2. **For listing/finding transactions** (e.g., "show failed payments", "find transactions for user@email.com") → use \`search_transactions\` with filters. Do NOT write raw SQL for simple lookups.
3. **For specific transaction details** (e.g., "explain pay_12345") → use \`explain_failure\`.
4. **For trend analysis** (e.g., "why are payments failing?", "analyze this week's failures") → use \`analyze_failures\`.
5. **For complex analytical queries** that the above tools can't handle → use \`query_database\` (read-only SELECT only).
6. **For recovering a transaction** (e.g., "recover pay_12345") → use \`trigger_recovery\`. Always confirm which transaction first.
7. **For creating payment links** → use \`generate_payment_link\`.

## Critical Rules
- NEVER guess a transaction ID. If the user says "recover the last failed payment", first use \`search_transactions\` to find it, then ask the user to confirm before triggering recovery.
- NEVER attempt to write, update, or delete data. You are read-only except for recovery and payment link creation.
- Keep responses concise. No walls of text.
- If something fails, explain what went wrong clearly.

## Database Schema (PostgreSQL)
- **transactions**: id, customer_name, customer_email, customer_phone, amount (paise), currency, type, status, failure_reason, failure_source, attempt_count, max_attempts, recovered_amount, created_at
- **recovery_runs**: id, status, source, total_transactions, total_at_risk_amount, total_recovered, recovery_rate
- **recovery_actions**: id, transaction_id, run_id, attempt_number, chosen_action, guardrail_check, razorpay_api_called, razorpay_short_url, simulated_outcome, recovery_result, created_at

Status vocabulary: failed, abandoned, overdue, recovery_sent, escalated, recovered, unrecoverable.`;


router.post("/", async (req, res) => {
  try {
    const { message, chat_history = [], context = {} } = req.body;
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Limit chat history to last 10 messages to avoid token overflow
    const recentHistory = chat_history.slice(-10);
    const formattedHistory = recentHistory.map(m => 
      m.role === 'user' ? { role: 'user', content: m.content } : { role: 'assistant', content: m.content }
    );
    
    // Build context string from current page
    let contextStr = '';
    if (context.path) contextStr += 'User is currently on page: ' + context.path + '. ';
    if (context.transactionId) contextStr += 'They are looking at transaction: ' + context.transactionId + '. ';
    
    const agent = createReactAgent({
      llm,
      tools,
      messageModifier: systemMessage + (contextStr ? '\n\nUser Context: ' + contextStr : ''),
    });
    
    const stream = await agent.streamEvents({
      messages: [...formattedHistory, { role: 'user', content: message }]
    }, { version: 'v2' });

    for await (const event of stream) {
      if (event.event === 'on_chat_model_stream') {
        const chunk = event.data.chunk;
        if (chunk && chunk.content && typeof chunk.content === 'string') {
          res.write('data: ' + JSON.stringify({ type: 'content', content: chunk.content }) + '\n\n');
        } else if (chunk && Array.isArray(chunk.content)) {
          const textPart = chunk.content.find(p => p.type === 'text');
          if (textPart && textPart.text) {
            res.write('data: ' + JSON.stringify({ type: 'content', content: textPart.text }) + '\n\n');
          }
        }
      } else if (event.event === 'on_tool_start') {
        const toolInfo = TOOL_LABELS[event.name] || { label: 'Processing', icon: 'default' };
        res.write('data: ' + JSON.stringify({ type: 'tool_start', name: event.name, label: toolInfo.label, icon: toolInfo.icon }) + '\n\n');
      } else if (event.event === 'on_tool_end') {
        res.write('data: ' + JSON.stringify({ type: 'tool_end', name: event.name }) + '\n\n');
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (err) {
    console.error("Chat error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write('data: ' + JSON.stringify({ type: 'error', error: err.message }) + '\n\n');
      res.end();
    }
  }
});

module.exports = router;
