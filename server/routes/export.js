const express = require('express');
const { queryAll } = require('../db/connection');

const router = express.Router();

/**
 * CSV field escaping with a formula-injection guard.
 *
 * Two separate problems:
 *  1. RFC4180 — a field containing a quote, comma, or newline must be quoted,
 *     with internal quotes doubled. The old code wrapped some fields in quotes
 *     without doubling, so a customer named `Foo "Bar"` corrupted the file.
 *  2. Formula injection — Excel/Sheets execute a cell starting with = + - @
 *     (or tab/CR), so an attacker-controlled name like `=cmd|' /C calc'!A0`
 *     becomes code on the analyst's machine. Prefix those with a single quote.
 */
function escapeCsv(value) {
  if (value === null || value === undefined) return '""';

  let s = String(value);

  // Neutralise anything a spreadsheet would treat as a formula.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;

  // Always quote, and double any embedded quote.
  return `"${s.replace(/"/g, '""')}"`;
}

// Risk score mirrors the SQL expression used by /api/transactions so the export
// agrees with the table. (P4-4 unifies both into one implementation.)
const RISK_SCORE_SQL = `
  LEAST(100, GREATEST(0,
    LEAST(COALESCE(t.attempt_count, 0) * 10, 30) +
    CASE
      WHEN t.amount > 5000000 THEN 25
      WHEN t.amount > 1000000 THEN 18
      WHEN t.amount > 500000  THEN 12
      WHEN t.amount > 100000  THEN 6
      ELSE 3
    END +
    CASE t.failure_reason
      WHEN 'mandate_revoked' THEN 25
      WHEN 'invoice_overdue_60' THEN 22
      WHEN 'invoice_overdue_30' THEN 15
      WHEN 'expired_card' THEN 18
      WHEN 'authentication_failed' THEN 14
      WHEN 'card_declined' THEN 12
      WHEN 'insufficient_funds' THEN 10
      WHEN 'user_abandoned' THEN 8
      WHEN 'session_timeout' THEN 5
      WHEN 'network_timeout' THEN 3
      ELSE 10
    END +
    CASE
      WHEN t.created_at < NOW() - INTERVAL '30 days' THEN 20
      WHEN t.created_at < NOW() - INTERVAL '14 days' THEN 14
      WHEN t.created_at < NOW() - INTERVAL '7 days' THEN 8
      ELSE 3
    END
  )) AS risk_score`;

router.get('/csv', async (req, res) => {
  try {
    const transactions = await queryAll(
      `SELECT t.*, ${RISK_SCORE_SQL} FROM transactions t ORDER BY t.created_at DESC`
    );

    const headers = [
      'Transaction ID', 'Customer Name', 'Email', 'Phone', 'Amount', 'Currency',
      'Type', 'Status', 'Failure Reason', 'Attempt Count', 'Recovered Amount',
      'Risk Score', 'Created At', 'Updated At',
    ];

    const rows = transactions.map((t) =>
      [
        t.id,
        t.customer_name,
        t.customer_email,
        t.customer_phone,
        (Number(t.amount || 0) / 100).toFixed(2), // paise → major unit
        t.currency || 'INR',
        t.type,
        t.status,
        t.failure_reason || '',
        Number(t.attempt_count || 0),
        (Number(t.recovered_amount || 0) / 100).toFixed(2),
        Number(t.risk_score || 0),
        t.created_at ? new Date(t.created_at).toISOString() : '',
        t.updated_at ? new Date(t.updated_at).toISOString() : '',
      ]
        .map(escapeCsv)
        .join(',')
    );

    // CRLF line endings per RFC4180, and a UTF-8 BOM so Excel renders ₹ and
    // non-ASCII customer names correctly instead of mojibake.
    const csvContent = '﻿' + [headers.map(escapeCsv).join(','), ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="revenue_recovery_report.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('Error generating CSV:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

module.exports = router;
module.exports.escapeCsv = escapeCsv; // exported for tests
