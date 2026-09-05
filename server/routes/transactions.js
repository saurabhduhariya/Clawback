const express = require('express');
const router = express.Router();
const { queryAll, queryOne } = require('../db/connection');

// GET /api/transactions — list all transactions with optional filters
router.get('/', async (req, res) => {
  try {
    const { status, type, search } = req.query;

    let sql = `SELECT t.*,
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
      )) as risk_score
    FROM transactions t WHERE 1=1`;
    const params = [];

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (type && type !== 'all') {
      sql += ' AND type = ?';
      params.push(type);
    }

    if (search) {
      sql += ' AND (customer_name ILIKE ? OR id ILIKE ?)';
      params.push('%' + search + '%', '%' + search + '%');
    }

    sql += ' ORDER BY created_at DESC';

    const transactions = await queryAll(sql, params);
    res.json(transactions);
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/transactions/summary — count by status and type
router.get('/summary', async (req, res) => {
  try {
    const byStatus = await queryAll(`
      SELECT status, COUNT(*) as count, SUM(amount) as total_amount
      FROM transactions GROUP BY status
    `);

    const byType = await queryAll(`
      SELECT type, COUNT(*) as count, SUM(amount) as total_amount
      FROM transactions GROUP BY type
    `);

    const total = await queryOne('SELECT COUNT(*) as count, SUM(amount) as total_amount FROM transactions');

    res.json({ total, byStatus, byType });
  } catch (err) {
    console.error('Error fetching summary:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/transactions/:id — single transaction detail
router.get('/:id', async (req, res) => {
  try {
    const transaction = await queryOne('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (err) {
    console.error('Error fetching transaction:', err);
    res.status(500).json({ error: err.message });
  }
});


// POST /api/transactions/mock — inject a mock transaction for hackathon judges
router.post('/mock', async (req, res) => {
  try {
    const { customer_name, customer_email, amount, failure_reason = 'expired_card' } = req.body;
    
    if (!customer_name || !customer_email || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const txId = 'tx_mock_' + Math.random().toString(36).substring(2, 10);
    const amtInt = parseInt(amount, 10);
    
    await queryOne(
      `INSERT INTO transactions (
        id, customer_name, customer_email, customer_phone, amount, 
        currency, type, status, failure_reason, failure_source, attempt_count, risk_score
      ) VALUES ($1, $2, $3, $4, $5, 'INR', 'payment', 'failed', $6, 'customer', 0, 85) RETURNING id`,
      [txId, customer_name, customer_email, '+919999999999', amtInt * 100, failure_reason]
    );

    res.json({ success: true, id: txId });
  } catch (err) {
    console.error('Error creating mock transaction:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

