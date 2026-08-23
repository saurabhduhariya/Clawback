const express = require('express');
const router = express.Router();
const { queryAll, queryOne } = require('../db/connection');

// GET /api/transactions — list all transactions with optional filters
router.get('/', (req, res) => {
  try {
    const { status, type, search } = req.query;

    let sql = 'SELECT * FROM transactions WHERE 1=1';
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
      sql += ' AND (customer_name LIKE ? OR id LIKE ?)';
      params.push('%' + search + '%', '%' + search + '%');
    }

    sql += ' ORDER BY created_at DESC';

    const transactions = queryAll(sql, params);
    res.json(transactions);
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/transactions/summary — count by status and type
router.get('/summary', (req, res) => {
  try {
    const byStatus = queryAll(`
      SELECT status, COUNT(*) as count, SUM(amount) as total_amount
      FROM transactions GROUP BY status
    `);

    const byType = queryAll(`
      SELECT type, COUNT(*) as count, SUM(amount) as total_amount
      FROM transactions GROUP BY type
    `);

    const total = queryOne('SELECT COUNT(*) as count, SUM(amount) as total_amount FROM transactions');

    res.json({ total, byStatus, byType });
  } catch (err) {
    console.error('Error fetching summary:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/transactions/:id — single transaction detail
router.get('/:id', (req, res) => {
  try {
    const transaction = queryOne('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (err) {
    console.error('Error fetching transaction:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
