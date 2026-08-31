const express = require('express');
const { queryAll } = require('../db/connection');

const router = express.Router();

router.get('/csv', async (req, res) => {
  try {
    const transactions = await queryAll('SELECT * FROM transactions ORDER BY created_at DESC');
    
    // Create CSV header
    const headers = ['Transaction ID', 'Customer Name', 'Email', 'Amount', 'Type', 'Status', 'Failure Reason', 'Attempt Count', 'Date'];
    
    const rows = transactions.map(t => {
      return [
        t.id,
        `"${t.customer_name}"`, 
        `"${t.customer_email}"`,
        (t.amount / 100).toFixed(2), // Convert from paise/cents to standard unit for CSV
        t.type,
        t.status,
        `"${t.failure_reason || ''}"`,
        t.attempt_count || 0,
        new Date(t.created_at).toISOString()
      ].join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="revenue_recovery_report.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('Error generating CSV:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

module.exports = router;
