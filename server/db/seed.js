const { getDb, saveDb } = require('./connection');
const { v4: uuidv4 } = require('uuid');

// ============================================
// 30 realistic Indian customer profiles
// ============================================
const CUSTOMERS = [
  { name: 'Saurabh Prajapat', email: 'kkpncc3188@gmail.com', phone: '+916377102158' },
  { name: 'Priya Patel', email: 'priya.patel@gmail.com', phone: '+919123456789' },
  { name: 'Amit Kumar', email: 'amit.kumar@gmail.com', phone: '+919234567890' },
  { name: 'Sneha Reddy', email: 'sneha.reddy@gmail.com', phone: '+919345678901' },
  { name: 'Vikram Singh', email: 'vikram.singh@gmail.com', phone: '+919456789012' },
  { name: 'Ananya Gupta', email: 'ananya.gupta@gmail.com', phone: '+919567890123' },
  { name: 'Arjun Nair', email: 'arjun.nair@gmail.com', phone: '+919678901234' },
  { name: 'Meera Iyer', email: 'meera.iyer@gmail.com', phone: '+919789012345' },
  { name: 'Karthik Menon', email: 'karthik.menon@gmail.com', phone: '+919890123456' },
  { name: 'Divya Joshi', email: 'divya.joshi@gmail.com', phone: '+919901234567' },
  { name: 'Rohan Desai', email: 'rohan.desai@gmail.com', phone: '+919012345678' },
  { name: 'Neha Banerjee', email: 'neha.banerjee@gmail.com', phone: '+919112345678' },
  { name: 'Siddharth Rao', email: 'siddharth.rao@gmail.com', phone: '+919213456789' },
  { name: 'Kavya Krishnan', email: 'kavya.krishnan@gmail.com', phone: '+919314567890' },
  { name: 'Aditya Malhotra', email: 'aditya.malhotra@gmail.com', phone: '+919415678901' },
  { name: 'Pooja Srinivasan', email: 'pooja.srinivasan@gmail.com', phone: '+919516789012' },
  { name: 'Manish Thakur', email: 'manish.thakur@gmail.com', phone: '+919617890123' },
  { name: 'Riya Agarwal', email: 'riya.agarwal@gmail.com', phone: '+919718901234' },
  { name: 'Suresh Pillai', email: 'suresh.pillai@gmail.com', phone: '+919819012345' },
  { name: 'Anjali Verma', email: 'anjali.verma@gmail.com', phone: '+919920123456' },
  { name: 'Deepak Choudhury', email: 'deepak.choudhury@gmail.com', phone: '+919021234567' },
  { name: 'Lakshmi Narayan', email: 'lakshmi.narayan@gmail.com', phone: '+919132345678' },
  { name: 'Rajesh Pandey', email: 'rajesh.pandey@gmail.com', phone: '+919243456789' },
  { name: 'Swati Mishra', email: 'swati.mishra@gmail.com', phone: '+919354567890' },
  { name: 'Nikhil Saxena', email: 'nikhil.saxena@gmail.com', phone: '+919465678901' },
  { name: 'Tanvi Shah', email: 'tanvi.shah@gmail.com', phone: '+919576789012' },
  { name: 'Gaurav Mehta', email: 'gaurav.mehta@gmail.com', phone: '+919687890123' },
  { name: 'Ishita Das', email: 'ishita.das@gmail.com', phone: '+919798901234' },
  { name: 'Harsh Goyal', email: 'harsh.goyal@gmail.com', phone: '+919809012345' },
  { name: 'Nandini Bhat', email: 'nandini.bhat@gmail.com', phone: '+919910123456' },
];

// ============================================
// Helper functions
// ============================================
function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedPick(options) {
  // options = { 'card_declined': 12, 'insufficient_funds': 8, ... }
  const entries = Object.entries(options);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let rand = Math.random() * total;
  for (const [key, weight] of entries) {
    rand -= weight;
    if (rand <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

function randomDateWithinLast30Days() {
  const now = Date.now();
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
  const randomTimestamp = thirtyDaysAgo + Math.random() * (now - thirtyDaysAgo);
  return new Date(randomTimestamp).toISOString().replace('T', ' ').slice(0, 19);
}

function getFailureSource(reason) {
  const sourceMap = {
    'card_declined': 'bank',
    'insufficient_funds': 'customer',
    'network_timeout': 'gateway',
    'expired_card': 'customer',
    'authentication_failed': 'customer',
    'user_abandoned': 'customer',
    'session_timeout': 'system',
    'mandate_revoked': 'customer',
    'invoice_overdue_30': 'customer',
    'invoice_overdue_60': 'customer',
  };
  return sourceMap[reason] || 'system';
}

// ============================================
// Generate transactions
// ============================================
function generateTransactions() {
  const transactions = [];

  // ----- 35 FAILED PAYMENTS -----
  for (let i = 0; i < 35; i++) {
    const customer = randomPick(CUSTOMERS);
    const failureReason = weightedPick({
      'card_declined': 12,
      'insufficient_funds': 8,
      'network_timeout': 5,
      'expired_card': 5,
      'authentication_failed': 5,
    });
    transactions.push({
      id: 'txn_pay_' + uuidv4().slice(0, 8),
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      amount: randomInt(15000, 5000000), // ₹150 to ₹50,000 in paise
      type: 'payment',
      status: 'failed',
      failure_reason: failureReason,
      failure_source: getFailureSource(failureReason),
      created_at: randomDateWithinLast30Days(),
    });
  }

  // ----- 30 ABANDONED CHECKOUTS -----
  for (let i = 0; i < 30; i++) {
    const customer = randomPick(CUSTOMERS);
    const failureReason = weightedPick({
      'user_abandoned': 15,
      'session_timeout': 10,
      'authentication_failed': 5,
    });
    transactions.push({
      id: 'txn_chk_' + uuidv4().slice(0, 8),
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      amount: randomInt(10000, 2500000), // ₹100 to ₹25,000
      type: 'checkout',
      status: 'abandoned',
      failure_reason: failureReason,
      failure_source: getFailureSource(failureReason),
      created_at: randomDateWithinLast30Days(),
    });
  }

  // ----- 30 FAILED SUBSCRIPTIONS -----
  const subscriptionAmounts = [9900, 19900, 29900, 49900, 99900]; // Common subscription prices
  for (let i = 0; i < 30; i++) {
    const customer = randomPick(CUSTOMERS);
    const failureReason = weightedPick({
      'card_declined': 10,
      'insufficient_funds': 8,
      'expired_card': 7,
      'mandate_revoked': 5,
    });
    transactions.push({
      id: 'txn_sub_' + uuidv4().slice(0, 8),
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      amount: randomPick(subscriptionAmounts),
      type: 'subscription',
      status: 'failed',
      failure_reason: failureReason,
      failure_source: getFailureSource(failureReason),
      created_at: randomDateWithinLast30Days(),
    });
  }

  // ----- 25 OVERDUE INVOICES (B2B) -----
  for (let i = 0; i < 25; i++) {
    const customer = randomPick(CUSTOMERS);
    const failureReason = weightedPick({
      'invoice_overdue_30': 15,
      'invoice_overdue_60': 10,
    });
    transactions.push({
      id: 'txn_inv_' + uuidv4().slice(0, 8),
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      amount: randomInt(500000, 10000000), // ₹5,000 to ₹1,00,000 (B2B = higher amounts)
      type: 'invoice',
      status: 'overdue',
      failure_reason: failureReason,
      failure_source: getFailureSource(failureReason),
      created_at: randomDateWithinLast30Days(),
    });
  }

  return transactions;
}

// ============================================
// Seed the database
// ============================================
async function seed() {
  const pool = await getDb();
  await pool.query("DELETE FROM recovery_actions");
  await pool.query("DELETE FROM recovery_runs");
  await pool.query("DELETE FROM transactions");

  const transactions = generateTransactions();

  for (const txn of transactions) {
    await pool.query(`
      INSERT INTO transactions (
        id, customer_name, customer_email, customer_phone,
        amount, type, status, failure_reason, failure_source, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT DO NOTHING
    `, [
      txn.id, txn.customer_name, txn.customer_email, txn.customer_phone,
      txn.amount, txn.type, txn.status, txn.failure_reason, txn.failure_source,
      txn.created_at,
    ]);
  }

  // Print summary
  console.log('🌱 Seeded database with', transactions.length, 'transactions:\n');

  const types = {};
  const reasons = {};
  let totalAmount = 0;

  for (const txn of transactions) {
    types[txn.type] = (types[txn.type] || 0) + 1;
    reasons[txn.failure_reason] = (reasons[txn.failure_reason] || 0) + 1;
    totalAmount += txn.amount;
  }

  console.log('  By type:');
  for (const [type, count] of Object.entries(types)) {
    console.log('    ' + type.padEnd(15) + count);
  }

  console.log('\n  By failure reason:');
  for (const [reason, count] of Object.entries(reasons).sort((a, b) => b[1] - a[1])) {
    console.log('    ' + reason.padEnd(25) + count);
  }

  console.log('\n  Total amount at risk: ₹' + (totalAmount / 100).toLocaleString('en-IN'));
  console.log('\n✅ Seeding complete!');
}

seed().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
