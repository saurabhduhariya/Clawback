# Clawback — Bug Fix Implementation Plan

Ordered fix plan derived from the full-codebase audit. Sequenced by **dependency + blast radius**, not by how easy each item is.

**Why this order:** Phases 1–2 are non-negotiable — Phase 1 fixes the code that writes *wrong data into the database*, and every dashboard, chart, and audit view reads from it. Polishing the UI before Phase 1 just renders false numbers more attractively. Phase 2 closes holes that are exploitable on the live Render URL right now. Phases 3–4 make the system stable and its aggregates honest. Phases 5–7 are per-page correctness, then docs and cleanup.

**Notation:** every task has an ID (`P1-1`), the files it touches, the defect, the fix, and a verification step. `⛔ blocks` means don't start the listed task until this one lands.

---

## Priority Summary

| Phase | Theme | Tasks | Severity | Why now |
|---|---|---|---|---|
| **1** | Recovery outcome truthfulness | 5 | 🔴 Critical | DB is being filled with false "recovered" rows |
| **2** | Security & data integrity | 6 | 🔴 Critical | Unauthenticated SQL + real payment links, live today |
| **3** | Runtime stability | 6 | 🟠 High | Crashes, stuck UI, leaks, orphaned runs |
| **4** | Metrics & schema correctness | 5 | 🟠 High | Aggregates wrong even after Phase 1 |
| **5** | Per-page UI correctness | 6 | 🟡 Medium | Visible to judges/users but non-destructive |
| **6** | Scheduler & config | 4 | 🟡 Medium | Auto-pilot drifts and resets on deploy |
| **7** | Docs & dead code | 3 | 🟢 Low | Credibility + maintainability |

Total: **35 tasks**. Suggested minimum before any demo: Phase 1 + Phase 2 + `P3-1`, `P3-2`, `P4-1`, `P5-1`.

---

# Phase 1 — Stop recording false recoveries

All five touch `graph/nodes/`. Do them as one unit; the pipeline is only coherent when they agree.
**⛔ blocks:** all of Phase 4 and Phase 5 (they display what this writes).

### P1-1 · Remove the `ref_id` success short-circuit
- **File:** `server/graph/nodes/simulateResponse.js:7`
- **Defect:** `if (razorpayResponse.ref_id && !error) → recoveryResult: "success"`. Because `execute.js` synthesises fake refs for reminders and escalations, this marks them 100% successful, and makes the `escalate_manual` branch at lines 19–29 unreachable.
- **Fix:** only treat a real Razorpay entity as success. Introduce an explicit flag from `execute` (e.g. `razorpayResponse.is_real_api_call = true` set only in the `create_payment_link` / `send_invoice` / `retry_payment` branches) and gate this early return on `is_real_api_call === true && !response?.error`. A created payment link means *link delivered*, not *money received* — see P1-3 for what result to record.
- **Verify:** run the agent on a `user_abandoned` checkout (forces `send_reminder`) and confirm the outcome is a dice roll, not automatic success.

### P1-2 · Never dice-roll a failed API call into a success
- **File:** `server/graph/nodes/simulateResponse.js:31-38`, `server/graph/nodes/execute.js:95-98`
- **Defect:** when `paymentLink.create` throws, `execute` swallows the error and leaves `refId = ""`. Control falls to the probability roll, which returns `paid` 55% of the time → `status='recovered'` + full `recovered_amount` written for a call that never succeeded.
- **Fix:** before the roll, `if (razorpayResponse?.response?.error) return { simulatedOutcome: 'api_error', recoveryResult: 'failed', auditLog: {…} }`. Also stop swallowing in `execute` — keep writing the error into `apiResponse` for the audit trail, but set an explicit `failed: true` so downstream nodes can't misread it.
- **Verify:** temporarily set a bad `RAZORPAY_KEY_SECRET`, run one transaction, confirm `recovery_result = 'failed'` and the transaction status is untouched.

### P1-3 · Distinguish "action dispatched" from "payment received"
- **Files:** `server/graph/nodes/simulateResponse.js`, `server/graph/nodes/updateState.js:15-17`, `server/config/constants.js:33-38`
- **Defect:** a created payment link is recorded as `recovered` with the full amount, conflating outreach with collection. There is no intermediate state, so `SIMULATION_RATES` is effectively decorative.
- **Fix:** add a `recovery_sent` (or `recovering`) status. Real API success → `recoveryResult: 'dispatched'`, transaction status `recovery_sent`, `recovered_amount` unchanged. Only the simulated `paid` outcome (or a future `payment.captured` webhook) sets `recovered`. `escalate_manual` → `pending`/`escalated`, never `recovered`.
- **Note:** this adds a new status value — coordinate with `P5-2` (filter vocabulary + CSS) and `P4-2` (metrics buckets) so the new state appears in the UI instead of silently disappearing.
- **Verify:** a successful link creation leaves `recovered_amount = 0` and shows as `recovery_sent`; only a `paid` roll flips it to `recovered`.

### P1-4 · Fix the `blocked_unrecoverable` infinite loop
- **File:** `server/graph/nodes/updateState.js:18-23`
- **Defect:** when `diagnose` says `mark_unrecoverable`, guardrail Rule 2 blocks and jumps straight to `updateState`, where `chosenAction` is `null` (`pickStrategy` was skipped) and the reason isn't `blocked_max_attempts`. Status stays `failed`, `increment = 0`, so the row is re-selected by every future run forever, burning Gemini quota.
- **Fix:** include `guardrailResult?.reason === 'blocked_unrecoverable'` in the condition that sets `newStatus = 'unrecoverable'`. Safer still: switch to an explicit map of terminal guardrail reasons → status, so a future rule can't silently create the same hole.
- **Verify:** inject a `mandate_revoked` mock, run twice — the second run must not select it.

### P1-5 · Make payment-link `reference_id` unique per attempt
- **File:** `server/graph/nodes/execute.js:23`
- **Defect:** `reference_id: transaction.id`. Razorpay requires account-wide uniqueness, so attempt 2 onward always errors — silently, and previously got dice-rolled into success by `P1-2`.
- **Fix:** `reference_id: \`${transaction.id}_a${transaction.attempt_count + 1}\``. Apply the same treatment to the `send_invoice` receipt/reference if present. Keep `transaction.id` in `notes` so you can still correlate in the Razorpay dashboard.
- **Also:** `currency` is hardcoded `"INR"` in all three branches — use `transaction.currency` with an `'INR'` fallback.
- **Verify:** run the same transaction twice; both attempts create links, and `recovery_actions` holds two distinct `razorpay_ref_id`s.

---

# Phase 2 — Close the security holes

Exploitable on the deployed backend as it stands. `P2-1` and `P2-2` are the two that matter most.

### P2-1 · Lock down the LLM's SQL tool
- **File:** `server/routes/chat.js:13-30`
- **Defect:** whatever SQL the model emits goes straight into `queryAll`. A prompt-injected message can `DROP TABLE transactions` or dump every customer email and phone. The tool description claims SELECT-only; nothing enforces it.
- **Fix, layered:**
  1. Reject anything not matching `/^\s*select\b/i`, and anything containing `;`, `--`, `/*`, or any of `insert|update|delete|drop|alter|truncate|grant|copy|create`.
  2. Wrap in a read-only transaction: `BEGIN TRANSACTION READ ONLY` … `ROLLBACK`.
  3. Set `statement_timeout` (e.g. 3000ms) on the connection used by the tool.
  4. Best: create a dedicated Postgres role with `SELECT`-only grants and a second pool for this tool — defence that survives a regex bypass.
  5. Force `LIMIT` — you already slice to 50 rows *after* fetching; append/enforce it in SQL instead.
- **Verify:** ask the bot to "delete all transactions" and confirm the tool refuses rather than executing.

### P2-2 · Add authentication, CORS allowlist, and rate limiting
- **Files:** `server/index.js:8`, all of `server/routes/`
- **Defect:** every endpoint is unauthenticated with `cors()` fully open. Anyone with the URL can enable auto-pilot, inject a transaction with an arbitrary email, fire real Razorpay links/SMS at it, download the full customer CSV, and query the DB via the chat agent.
- **Fix:**
  - Shared-secret middleware (`x-api-key` from env) on everything that mutates or reads customer data: `/api/transactions/mock`, `/api/recovery/*`, `/api/scheduler/*`, `/api/chat`, `/api/export/*`. Client sends it from `VITE_API_KEY` via `fetchApi`.
  - `cors({ origin: process.env.ALLOWED_ORIGINS.split(',') })`.
  - `express-rate-limit`: strict on `/api/chat` and `/api/recovery/start`, looser elsewhere.
  - Exempt `/api/webhooks/razorpay` from the API key (it authenticates by HMAC — see `P2-3`) and from CORS.
- **Note:** a shared key in a Vite bundle is not real auth — it stops drive-by abuse, not a determined attacker. If this outlives the hackathon, move to real sessions.
- **Verify:** `curl` each protected route with no key → 401; the dashboard still works end to end.

### P2-3 · Fix webhook signature verification
- **File:** `server/routes/webhooks.js:7-27`, `server/index.js:9`
- **Defect:** the HMAC is computed over `JSON.stringify(req.body)` — a re-serialisation of the parsed body. Razorpay signs the raw bytes, so key order and whitespace will differ and **every legitimate webhook is rejected**. Plus: secret defaults to `'your_secret'`, the compare isn't timing-safe, and there's no idempotency.
- **Fix:**
  1. Mount `express.raw({ type: 'application/json' })` on this route *before* the global `express.json()`, and HMAC the buffer directly.
  2. `crypto.timingSafeEqual` on equal-length buffers.
  3. Fail fast at boot if `RAZORPAY_WEBHOOK_SECRET` is unset — never fall back to a placeholder.
  4. Dedupe on the Razorpay event ID: a `webhook_events(event_id PRIMARY KEY, received_at)` table, insert-or-skip before processing. Razorpay retries; today each retry launches another agent run.
  5. Wrap everything after `res.status(200)` in try/catch — those bare `await`s currently produce an unhandled rejection that can take the process down.
- **Verify:** replay a captured Razorpay webhook payload byte-for-byte and confirm a 200 + a single agent run; send the same event ID twice and confirm the second is skipped.

### P2-4 · Fix the `run_id = 0` foreign-key violation
- **Files:** `server/routes/webhooks.js:63`, `server/routes/chat.js:42`, `server/graph/nodes/updateState.js:37-52`
- **Defect:** webhook and chatbot recoveries invoke the graph with `runId: 0`, but `recovery_actions.run_id` is `NOT NULL` with an FK to `recovery_runs(id)`, and no row with id `0` exists. Every such recovery should be failing its audit insert.
- **Fix:** insert a lightweight `recovery_runs` row (`total_transactions = 1`, a `source` column of `'webhook'` / `'chat'` / `'manual'`) and pass its real id. Add a `source TEXT` column to `recovery_runs` while you're there — it's useful in the runs list.
- **Verify:** trigger a recovery from the chatbot, then confirm a matching `recovery_actions` row exists.

### P2-5 · Gate real customer notifications
- **File:** `server/graph/nodes/execute.js:21`, `server/config/constants.js`
- **Defect:** `notify: { sms: true, email: true }` on live Razorpay calls. Running the agent over seeded data attempts to SMS/email 30 fabricated contacts, one of which looks like a real address (`server/db/seed.js:8`).
- **Fix:** a `DRY_RUN` / `NOTIFY_CUSTOMERS` env flag. When off, still create the Razorpay entity (so the demo shows a real link) but set `notify: { sms: false, email: false }`. Consider an allowlist of addresses that may be notified in non-production.
- **Verify:** with the flag off, create a link and confirm no notification is dispatched.

### P2-6 · Harden the CSV export
- **File:** `server/routes/export.js:13-25`
- **Defect:** no escaping of embedded `"` (a name containing a quote corrupts the file), no formula-injection guard (`=`, `+`, `-`, `@` → executes in Excel/Sheets), `recovered_amount` missing, no auth on a full PII dump.
- **Fix:** one `escapeCsv()` helper that doubles internal quotes, always wraps, and prefixes a leading `=+-@` with `'`. Add `recovered_amount`, `risk_score`, `currency`. Route sits behind `P2-2`'s auth.
- **Verify:** seed a customer named `Foo "Bar" =cmd|' /C calc'!A0`, export, and open the file safely.

---

# Phase 3 — Runtime stability

### P3-1 · Fix the Gemini config
- **File:** `server/config/gemini.js:17-23`
- **Defect:** `let llm = llms[1]` hardcodes the *second* key — with one key configured, `llm` is `undefined` and `createReactAgent` throws, killing the chatbot entirely. Works today only because `.env` happens to hold 3 keys. The model IDs also disagree: `gemini-3.6-flash` here vs `gemini-3.5-flash` in `utils/llmRunner.js`, while the README advertises Gemini 1.5.
- **Fix:** `llms[0]`, throw a clear startup error if `keys.length === 0`, and move the model name to `GEMINI_MODEL` env with one verified default. **Confirm the model ID against the live model list** — if it 404s, `diagnose` silently uses its fallback for every transaction and the "AI" is inert.
- **Add:** log loudly (`console.warn`) whenever the `diagnose` fallback path at `diagnose.js:61` fires, and surface it in the SSE log — silent degradation to a hardcoded diagnosis is the worst failure mode for a demo.
- **Verify:** run with a single key in `.env`; the chatbot must work. Then check server logs for zero fallback warnings during a run.

### P3-2 · Clear `running` on every terminal SSE path
- **File:** `client/src/context/RecoveryContext.jsx:55-63, 84-87`
- **Defect:** only the `complete` event calls `setRunning(false)`. A job that ends with status `error` emits no `complete`, so the Run button stays disabled until a reload.
- **Fix:** in the `error` listener, set `running = false`, `done = true`, and close the EventSource. Add a `fatal`/`end` event from `JobManager` when a job terminates abnormally so the client has one unambiguous terminator.
- **Verify:** force a job error (bad DB credentials mid-run) and confirm the button re-enables.

### P3-3 · Stop the EventSource reconnect loop
- **File:** `client/src/context/RecoveryContext.jsx:33-88`, `server/routes/recovery.js:76-97`
- **Defect:** for a finished job the server replays logs then `res.end()`. If the replay contains no `complete` event — e.g. reconnecting with `lastIndex` already past it — the client never closes and `EventSource` silently reconnects every ~3s forever. `es.onerror` is an empty comment block.
- **Fix:** always emit a terminal `event: done` before `res.end()` when `job.status !== 'running'`, regardless of `lastIndex`; close the EventSource on it. Add a reconnect-attempt cap in `onerror` with a user-visible "stream lost — reconnect?" state instead of an invisible retry loop.
- **Verify:** open `/recover` for a completed run and watch the network panel — exactly one request.

### P3-4 · Fix the double-subscribe / duplicated logs on mount
- **File:** `client/src/pages/RecoveryRun.jsx:79-82`, `client/src/context/RecoveryContext.jsx:146-170`
- **Defect:** the mount effect calls both `reconnect()` and `checkExistingJob()`, with `[reconnect, checkExistingJob]` as deps — `reconnect`'s identity changes with `runId`/`running`, so the effect re-fires. `checkExistingJob` then connects with `lastIndex = 0`, replaying the entire log on top of what's already in state.
- **Fix:** collapse to one idempotent `resume()` in the context that decides internally whether to reconnect (using `logCountRef.current` as `lastIndex`) or discover a job, guarded by a ref so it runs once per mount. Empty dep array. Dedupe on the server-provided `_index` when appending logs so a replay can never double up.
- **Verify:** start a run, navigate to Dashboard and back — logs continue with no repeats.

### P3-5 · Job store lifecycle: leaks, restarts, races, unbounded input
- **Files:** `server/services/jobManager.js:11,18-41,192-200`, `server/routes/recovery.js:9-19,28-33`
- **Defects:**
  - `jobs` Map is never evicted; `job.logs` grows unbounded → slow leak.
  - On restart, in-flight jobs vanish while their `recovery_runs` rows stay `status='running'` forever — nothing reconciles them.
  - The duplicate guard only inspects `getLatestJob()`, so an older still-running job doesn't block a new one, and two simultaneous POSTs race straight through.
  - `limit` is unbounded — `{"limit": 99999}` is accepted.
  - The batch `SELECT … LIMIT ?` has no `ORDER BY`, so which transactions get picked is nondeterministic.
- **Fix:** evict completed jobs after a TTL (e.g. 30 min) and cap `logs` length; on boot, `UPDATE recovery_runs SET status='interrupted' WHERE status='running'`; check *any* running job (or better, a Postgres advisory lock so it holds across instances); clamp `limit` to `1..50`; add `ORDER BY created_at ASC` (oldest-first is the defensible policy — or `risk_score DESC` if you want to lead with value at risk).
- **Also:** the fetch query is duplicated between `recovery.js:28-33` and `jobManager.js:53-64` — extract one `fetchRecoverableTransactions()`.
- **Verify:** restart the server mid-run and confirm no `recovery_runs` row is left `running`; fire two `/start` calls concurrently and confirm one 409s.

### P3-6 · Make `updateState` atomic
- **File:** `server/graph/nodes/updateState.js:9-52`
- **Defect:** read-then-write with no transaction or row lock — the "prevent race conditions" comment doesn't hold. A failure between the two writes updates the transaction with no audit record.
- **Fix:** one `BEGIN`/`COMMIT` around both statements (a dedicated client from the pool, not `queryAll`), and make the update conditional: `UPDATE transactions SET … WHERE id = $1 AND status <> 'recovered'` so a concurrent success can't be clobbered. Drop the mid-file `require` at line 8 in favour of the top-level import.
- **Verify:** run two concurrent recoveries on the same transaction ID; no lost update, exactly two audit rows.

---

# Phase 4 — Metrics & schema correctness

### P4-1 · Fix the 14-day recovery chart
- **File:** `server/routes/metrics.js:54-61`
- **Defect:** `ORDER BY date ASC LIMIT 30` keeps the *earliest* 30 days. Past 30 distinct recovery dates, the last 14 days all render as zero.
- **Fix:** `WHERE status='recovered' AND updated_at >= NOW() - INTERVAL '14 days'` and drop the `LIMIT`, or order `DESC`. Also note `updated_at` is a proxy for "recovery date" — any later edit moves a recovery between days. Consider a dedicated `recovered_at` column.
- **Verify:** seed recoveries across 40 distinct days and confirm the last 14 populate.

### P4-2 · Fix `recovery_rate` and the `total_at_risk` semantics
- **File:** `server/routes/metrics.js:8, 101-114`
- **Defect:** `total_at_risk = SUM(amount)` over *all* transactions, including already-recovered ones, and `recovery_rate` divides recovered by that inflated denominator. `total_pending` — the real at-risk figure — is computed and returned but displayed nowhere.
- **Fix:** return both and name them honestly: `total_pending_amount` (the at-risk headline), `total_lifetime_amount`, plus `recovery_rate_by_amount` (recovered ÷ (recovered + pending + unrecoverable)) and `recovery_rate_by_count`. Update the Dashboard in `P5-1` to use them.
- **Verify:** hand-compute both rates from the seeded DB and match the response.

### P4-3 · Coerce all pg aggregates to numbers
- **File:** `server/routes/metrics.js:14-48`, `server/routes/transactions.js:69-88`, `server/routes/chat.js:91-101`
- **Defect:** `COUNT`/`SUM` return strings in `pg`, and `by_type` / `by_reason` / `by_action` / `/summary` spread them through raw — the exact trap `AI_MEMORY.md` rule 5 documents. String concat surfaces downstream.
- **Fix:** one `numify(row, ['total','recovered','count','total_amount', …])` helper applied at every aggregate boundary.
- **Verify:** `typeof` check every numeric field in the `/api/metrics` response.

### P4-4 · Unify the risk score into one implementation
- **Files:** `server/routes/transactions.js:11-39`, `server/graph/nodes/riskScore.js`
- **Defect:** scored twice with different logic — the SQL version uses `attempt_count × 10`, the agent uses past-failure count, and the sub-₹1000 bucket differs (3 vs 0). Table and pipeline can disagree for the same row.
- **Fix:** one `services/riskScore.js` as the single source of truth. Cheapest path: persist `risk_score` on the transaction when the agent computes it, and have the list endpoint read the column (falling back to the SQL expression only where null). Removes 30 lines of duplicated SQL from the hot list query.
- **Verify:** the score in the table matches the score in that transaction's audit log.

### P4-5 · Schema: indexes, column types, timestamps
- **File:** `server/db/setup.js`
- **Defects:** no index on `transactions(status)`, `transactions(created_at)`, or `recovery_actions(transaction_id, run_id)` — every metrics call does 10+ sequential seq-scans. `amount INTEGER` caps at ~₹21.4 crore in paise. `updated_at` has a default but no trigger, so it only moves when code remembers to set it.
- **Fix:** add the indexes; `amount`/`recovered_amount`/`total_*_amount` → `BIGINT`; an `updated_at` trigger; and a `CHECK` constraint or enum on `status` so a typo can't invent a new state (coordinate with `P1-3`'s new status).
- **Add:** a `db/migrate.js` with numbered idempotent migrations — `setup.js` is `CREATE TABLE IF NOT EXISTS` only, so it cannot alter an existing deployed table. Without this, none of the above reaches production.
- **Verify:** `EXPLAIN ANALYZE` the metrics queries before/after; confirm index usage.

---

# Phase 5 — Per-page UI correctness

### P5-1 · Dashboard
- **File:** `client/src/pages/Dashboard.jsx`
- **Fixes:**
  1. **Real funnel.** `pipelineStages` (lines 161-167) fabricates Diagnosed/Guardrails/Executed as `failedCount × 0.85 / 0.72 / 0.60`. The real funnel from `/api/metrics` is already mapped into `stages` (line 143) and never rendered — oxlint flags it unused. Render `stages`, delete the multipliers.
  2. **Honest headline.** Line 235 shows `total_at_risk` (everything ever) labelled "Revenue at risk" — switch to `total_pending_amount` from `P4-2`. Same for the `${m.total_transactions} failed transactions` subtitle.
  3. **One labelled rate.** `m.recovery_rate` (amount-weighted) and `conversionRate` (count-based, line 159) both appear unlabelled. Show both from `P4-2`, each labelled.
  4. **Donut colours.** `pieData` is filtered by `value > 0` (line 173) but the three `<Cell>` children (321-323) are positional — zero recoveries paints "Failed" emerald. Map cells from the data.
  5. **Delete the fabrications:** trend badges `+12.4% / +18.6% / +14.7% / -3.2%` (235-238), `vs ${recovery_rate - 14.7}% last month` (237), the hardcoded sparkline path (line 44), and the "outperforming by 20.6%" insight fallback (179-180) — which the "View strategy report" button then feeds to the bot as fact (345) regardless of data. Either compute them (you have `recovery_over_time`) or remove them.
  6. **Refresh.** Fetches once on mount; a run finishing elsewhere never updates it. Poll while a job is running, or refetch on window focus.
- **Verify:** every number on the page traceable to a `/api/metrics` field. No literal percentages in the JSX.

### P5-2 · Transactions
- **File:** `client/src/pages/Transactions.jsx`, `client/src/index.css`
- **Fixes:**
  1. **Filter vocabulary.** The dropdown offers `Pending` and `Recovering` (line 156) which no row ever has, and omits `Unrecoverable` entirely. Derive the option list from the actual status enum (including `P1-3`'s new state).
  2. **Missing CSS.** `index.css` defines `.status-recovered/-failed/-overdue/-abandoned` (354-357) only — unrecoverable renders unstyled. Add the missing classes.
  3. **Type column** (line 190) shows `failure_reason || type`. Show `type`; move the reason to its own column or the row tooltip.
  4. **Recovered column** (line 185) uses `isRecovered ? amt : 0` — use `t.recovered_amount`, which matters as soon as `P1-3` lands.
  5. **Use the server filter.** `/api/transactions` fully supports `status`/`type`/`search` with `ILIKE`; the page fetches everything and re-filters in JS (81-88) with *different* semantics (client: name+email, server: name+id). Switch to server-side, debounced, and add pagination.
  6. **Toasts, not `alert()`** (34, 41, 49) — `ToastContext` already exists.
  7. **Validate the mock form** server-side (`transactions.js:106-131`): `parseInt('abc')` → `NaN` → 500 surfaced as a raw alert. Require amount > 0, a valid email, and a sane max.
  8. Add column sorting and a bulk "recover selected" action.
- **Verify:** every dropdown option returns rows when matching data exists; a 50k-row table stays responsive.

### P5-3 · Recovery Run
- **File:** `client/src/pages/RecoveryRun.jsx`
- **Fixes:**
  1. **Three dead controls.** "Days back" (182) and "Auto-execute" (179) are never sent — `startRecovery` forwards only `limit` and `transactionId`. The interval dropdown (153-158) is hardcoded `"Every 6h"` with `onChange={() => {}}`, contradicting the real scheduler shown on the other two pages. Either wire them (add `daysBack` → a `created_at >= NOW() - INTERVAL` clause; `autoExecute: false` → run the graph but skip `execute`) or remove them. Wiring `daysBack` is genuinely useful; the fake interval selector should just read the real scheduler status.
  2. **Refs during render.** `highWaterRef.current` is read *and mutated* inside `useMemo` (113-117) — oxlint flags it, and StrictMode's double render can advance the mark twice. Move it into an effect keyed on `activeNode`, or derive from the max stage index seen in `logs`.
  3. **Show per-transaction progress.** The graph animates one set of 8 nodes for the whole batch, so a 15-transaction run looks stuck. Add an "n of N" counter and a per-transaction result list from `job.results`.
  4. **Expose the artificial delay.** `jobManager.js:108` adds 1200ms × 8 nodes ≈ 10s per transaction — a default batch of 15 takes 2.5 minutes. Make it a `DEMO_DELAY_MS` env var (0 in production) and add an SSE heartbeat comment every 15s so proxies don't drop the stream.
- **Verify:** no control on the page is inert; a 15-transaction run shows visible per-item progress.

### P5-4 · Audit Trail
- **File:** `client/src/pages/AuditTrail.jsx`, `server/routes/audit.js`
- **Fixes:**
  1. **Wrong attempt shown.** Line 56 takes `actions[0]` from an `ORDER BY created_at ASC` list, so "AI Diagnosis" and the raw-JSON panel (203) describe attempt #1 after three attempts. Use the last element, or let the user pick per timeline entry.
  2. **Success shown in red.** Line 186 colours anything `!== 'paid'` red — including `link_sent`, the success path (and `dispatched` after `P1-3`). Map outcome → tone explicitly.
  3. **Format timestamps** (194) — raw pg string today.
  4. **Two missing `key` props** (113-114), flagged by oxlint.
  5. **Humanise guardrail reasons** — `blocked_max_attempts` is shown raw.
  6. **Show the risk score** and its contributing factors; the pipeline computes them and the audit page is where they belong.
  7. **Distinguish 404 from network error** — both render "Transaction not found" today, with no back link. Server-side, the `JSON.parse` calls (`audit.js:21-23`) 500 the whole endpoint if any stored column isn't valid JSON — wrap each in a try/catch that falls back to the raw string.
- **Verify:** a 3-attempt transaction shows the latest diagnosis, correct colours, and a formatted timestamp per entry.

### P5-5 · Landing
- **File:** `client/src/pages/Landing.jsx`
- **Fixes:**
  1. **Paise shown as rupees — every figure is 100× too big.** `formatAmt` (27-30) omits the `/100` every other page applies: ₹3,199 renders as "₹3.19L". The chart (line 40) has the same bug and mixes with placeholder data on a 0–50 scale. This is the single most visible number error in the app.
  2. Hardcoded `< 2 min avg recovery` and MiniStat's `+18.6%`; the "Watch Demo" modal is a static fake terminal. Compute or drop.
  3. Reformat the file — it's written as unindented single-line JSX and is the least maintainable file in the repo.
- **Verify:** landing figures match the Dashboard exactly.

### P5-6 · RecoverBot
- **File:** `client/src/components/RecoverBot.jsx`
- **Fixes:**
  1. `handleSend` is referenced in a `useEffect` declared above it (line 23) — works only thanks to `setTimeout(…, 100)`, and the listener closes over a stale copy. `useCallback` + register the effect after.
  2. State mutated in place: `updated[updated.length - 1].content = …` (97) — same object reference; re-render happens only because the array is new. Build a new message object.
  3. Server errors swallowed: the `throw` inside the parse `try` is caught by the inner `catch (e)` that logs "Error parsing SSE" (104-109). Handle `type === 'error'` outside the parse block.
  4. Dead code: a `token` read from `localStorage` that nothing writes (58), and an unused `fetchApi` import.
  5. No `AbortController` — closing the panel leaves the stream running. Abort on close and on unmount.
  6. Chat history grows unbounded and is resent whole every turn; cap it.
- **Verify:** send a message, close the panel mid-stream, confirm the request aborts; force a server error and confirm it surfaces in the bubble.

---

# Phase 6 — Scheduler & config

### P6-1 · Fix the interval math
- **File:** `server/services/scheduler.js:36-51, 119-145`
- **Defect:** `0 */7 * * *` fires at 0,7,14,21 then resets, while `calculateNextRun` assumes clean modulo — so any interval that doesn't divide 24 shows a wrong "next run". The UI offers 2/6/12/24, but `/toggle` accepts any 1–24 (line 126).
- **Fix:** restrict to divisors of 24 (`[1,2,3,4,6,8,12,24]`) and validate server-side, or switch to an explicit cron expression. Better: use the scheduled task's own next-invocation time rather than recomputing it by hand.
- **Verify:** each allowed interval's displayed next-run matches when the job actually fires.

### P6-2 · Move scheduler state into the database
- **File:** `server/services/scheduler.js:9-34`
- **Defect:** config lives in `scheduler_config.json` on Render's ephemeral filesystem, so auto-pilot resets on every deploy. The file is currently **0 bytes**, so `JSON.parse('')` throws on boot and config never loads (silently caught).
- **Fix:** an `app_settings(key, value)` table (or a single-row `scheduler_config`). Delete the JSON file and its read/write path.
- **Verify:** toggle auto-pilot on, restart the server, confirm it's still on.

### P6-3 · Keep `nextRunTime` accurate
- **File:** `server/services/scheduler.js:93, 110-117`
- **Defect:** only recalculated after a *successful* run, so following a skipped or empty cycle the UI shows a stale time in the past.
- **Fix:** compute it on read in the `/status` handler rather than caching it.
- **Verify:** let a cycle pass with no recoverable transactions; the displayed next run advances.

### P6-4 · Allow manual trigger while paused, and make it single-instance safe
- **File:** `server/services/scheduler.js:147-153`
- **Defect:** `/trigger` refuses to run when auto-pilot is disabled — an odd restriction for a manual trigger. Also every replica runs its own cron.
- **Fix:** drop the `isEnabled` check on the manual path (keep it for the cron path); return the created `runId` so the UI can attach its SSE stream. Guard the cron path with a Postgres advisory lock or a `scheduler_leases` row so only one instance fires.
- **Verify:** trigger while paused → a run starts; run two instances → only one cron fires.

---

# Phase 7 — Docs & cleanup

### P7-1 · Make the README match the code
- **File:** `README.md`
- **Corrections needed:**
  - **Remove all Resend/email claims** — there is no `resend` dependency and zero references in the codebase, yet it appears in the feature table, both diagrams, the sequence diagram, and the env var list.
  - Replace the Project Structure block: `services/emailService.js`, `services/paymentService.js`, `graph/agent.js` don't exist; `jobManager.js`, `recoveryGraph.js`, `graph/nodes/`, `routes/chat.js`, `routes/export.js` aren't listed.
  - Guardrails: drop "fraud check" and "Do Not Contact list" — `checkGuardrails.js` has two rules and a comment explaining a third was removed.
  - Drop "Full Loop Tracking … `payment.captured`" until it exists (see `P7-3`).
  - Webhook path is `POST /api/webhooks/razorpay`, not `/api/webhooks`. Add the missing endpoints: `/api/recovery/*`, `/api/audit/:id`, `/api/chat`, `/api/scheduler/*`, `/api/export/csv`.
  - Env vars: remove `RESEND_API_KEY`, add `RAZORPAY_WEBHOOK_SECRET`, `GEMINI_MODEL`, and the new auth/CORS/DRY_RUN vars. Mirror all of it into `.env.example`.
  - Model name: says Gemini 1.5 Pro/Flash, code says otherwise — fix after `P3-1`.
  - Add a LICENSE file (currently linked but absent), and document that recovery outcomes are **simulated** — after `P1-3` that's a design choice worth stating plainly rather than a thing to hide.

### P7-2 · Fix scripts and delete dead code
- **Files:** `server/package.json`, `package.json`, various
- **Fixes:**
  - `server/package.json` has no `dev` or `start` script — only `test`, which errors — yet the README documents `cd server && npm run dev`. Add `"dev": "nodemon index.js"` and `"start": "node index.js"` (Render needs the latter).
  - Root README doesn't mention installing root deps for `concurrently`.
  - Delete unreferenced files: `server/utils/llmRunner.js`, `client/src/components/Navbar.jsx`, `Sidebar.jsx`, `IntervalDropdown.jsx`, `StatusBadge.jsx`.
  - Remove dead config in `server/config/constants.js`: `MAX_DAILY_CONTACTS_PER_CUSTOMER`, `CHANNEL_PREFERENCE`, `TRANSACTION_TYPES`, `FAILURE_TYPES`, `TEST_CARDS` — or implement them (a daily contact cap is a genuinely good guardrail).
  - Fix `client/src/utils/api.js:26`: `startRecoveryRun` posts to `/recovery/run`, which doesn't exist (the route is `/recovery/start`). Unused today, a trap tomorrow.
  - Clear the ~15 unused imports oxlint already lists; get `npm run lint` to zero warnings.
  - Remove the naive `?` → `$n` rewriting in `db/connection.js:19` — it blind-replaces every `?` outside `$n` queries, including inside string literals. Standardise on `$n` and delete the shim.

### P7-3 · Close the loop: handle `payment.captured`
- **File:** `server/routes/webhooks.js`
- **Rationale:** the README's headline "Full Loop Tracking" feature. With `P1-3`'s `recovery_sent` state in place, this is what makes a recovery *real* rather than simulated — the single highest-value feature addition in this plan.
- **Fix:** handle `payment.captured`; match by `reference_id` / `notes.transaction_id` back to the original transaction; set `status = 'recovered'` with the actual captured `amount` as `recovered_amount`; write a `recovery_actions` row of type `payment_captured`. Then simulated outcomes can be clearly labelled as simulated and real ones as real.
- **Verify:** create a link in Razorpay test mode, pay it with a test card, and watch the transaction flip to `recovered` with the true amount.

---

## Suggested execution order

```
Phase 1  (P1-1 → P1-5)   ── one sitting; the pipeline is incoherent half-done
Phase 2  (P2-1, P2-2 first, then P2-3 → P2-6)
P3-1, P3-2, P3-3, P3-4   ── unblocks reliable manual testing
P4-5 (migrations) ── needed before any other schema change ships
P4-1 → P4-4
P5-1, P5-2, P5-5         ── the three most-seen pages
P3-5, P3-6               ── stability, once behaviour is correct
P5-3, P5-4, P5-6
Phase 6
Phase 7  (P7-1 last, so the README describes the final state)
```

**One caveat on sequencing:** `P4-5` introduces `db/migrate.js`. Any earlier task that needs a schema change — `P1-3`'s new status, `P2-3`'s `webhook_events` table, `P2-4`'s `source` column — will need that migration runner, or a hand-run `ALTER`. If you'd rather not hand-run anything, pull `P4-5` forward to sit immediately after Phase 1.
