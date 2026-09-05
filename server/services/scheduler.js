const cron = require("node-cron");
const { queryAll, run } = require("../db/connection");
const JobManager = require("./jobManager");
const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "../scheduler_config.json");

let isEnabled = false;
let currentTask = null;
let nextRunTime = null;
let lastRunStats = null;
let intervalHours = 6; // Default to 6 hours

// Load configuration if exists
try {
  if (fs.existsSync(CONFIG_PATH)) {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    if (typeof config.isEnabled === "boolean") isEnabled = config.isEnabled;
    if (typeof config.intervalHours === "number") intervalHours = config.intervalHours;
  }
} catch (err) {
  console.error("[Scheduler] Error loading config:", err);
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ isEnabled, intervalHours }));
  } catch (err) {
    console.error("[Scheduler] Error saving config:", err);
  }
}

function getCronSchedule() {
  return `0 */${intervalHours} * * *`;
}

function calculateNextRun() {
  const now = new Date();
  let nextHour = now.getHours() + (intervalHours - (now.getHours() % intervalHours));
  let nextDay = now.getDate();
  if (nextHour >= 24) {
    nextHour = nextHour % 24;
    nextDay++;
  }
  
  const next = new Date(now.getFullYear(), now.getMonth(), nextDay, nextHour, 0, 0, 0);
  return next.toISOString();
}

async function triggerAutonomousRecovery() {
  if (!isEnabled) return;
  console.log("[Scheduler] Triggering autonomous recovery run...");
  try {
    const limit = 15; // Batch size
    
    // Check for running job
    const latest = JobManager.getLatestJob();
    if (latest && latest.status === "running") {
      console.log("[Scheduler] A job is already running. Skipping this cycle.");
      return;
    }

    const transactions = await queryAll(
      `SELECT * FROM transactions
       WHERE status IN ('failed', 'abandoned', 'overdue')
       AND attempt_count < max_attempts LIMIT $1`,
      [limit]
    );

    if (transactions.length === 0) {
      console.log("[Scheduler] No transactions to recover.");
      return;
    }

    const totalAtRisk = transactions.reduce((sum, t) => sum + t.amount, 0);

    const { lastInsertRowid: runId } = await run(
      `INSERT INTO recovery_runs (total_transactions, total_at_risk_amount) VALUES ($1, $2) RETURNING id`,
      [transactions.length, totalAtRisk]
    );

    JobManager.startJob(runId, { limit });
    lastRunStats = {
      runId,
      time: new Date().toISOString(),
      transactions: transactions.length,
      atRisk: totalAtRisk
    };

    nextRunTime = calculateNextRun();
  } catch (err) {
    console.error("[Scheduler] Error during autonomous run:", err);
  }
}

function startScheduler() {
  if (currentTask) currentTask.stop();
  currentTask = cron.schedule(getCronSchedule(), triggerAutonomousRecovery);
  if (isEnabled) {
    nextRunTime = calculateNextRun();
  } else {
    nextRunTime = null;
  }
  console.log(`[Scheduler] Initialized (${intervalHours}h). Auto-Pilot is ` + (isEnabled ? "ON" : "OFF"));
}

router.get("/status", (req, res) => {
  res.json({
    enabled: isEnabled,
    intervalHours,
    nextRunTime: isEnabled ? nextRunTime : null,
    lastRunStats
  });
});

router.post("/toggle", (req, res) => {
  const { enable, interval } = req.body;
  let changed = false;
  if (typeof enable !== "undefined") {
    isEnabled = Boolean(enable);
    changed = true;
  }
  if (typeof interval === "number" && interval > 0 && interval <= 24) {
    intervalHours = interval;
    changed = true;
  }
  
  if (changed) {
    startScheduler(); 
    saveConfig();
  }
  
  if (isEnabled) {
    nextRunTime = calculateNextRun();
    console.log(`[Scheduler] Auto-Pilot ENABLED (Interval: ${intervalHours}h)`);
  } else {
    nextRunTime = null;
    console.log("[Scheduler] Auto-Pilot DISABLED");
  }
  
  res.json({ enabled: isEnabled, intervalHours, nextRunTime });
});

router.post("/trigger", async (req, res) => {
  if (!isEnabled) {
    return res.status(400).json({ error: "Scheduler is disabled. Enable it first." });
  }
  await triggerAutonomousRecovery();
  res.json({ message: "Triggered successfully", lastRunStats, nextRunTime });
});

module.exports = { router, startScheduler };
