const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { getDb } = require('./db/connection');

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/recovery', require('./routes/recovery'));
app.use('/api/metrics', require('./routes/metrics'));
app.use('/api/audit', require('./routes/audit'));

// Initialize DB then start server
const PORT = process.env.PORT || 3001;

getDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`Transactions: http://localhost:${PORT}/api/transactions`);
  });
}).catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
