const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
require('dotenv').config();

// ── Key parsing ──
function getApiKeys() {
  let rawKeys = process.env.GEMINI_API_KEY || '';
  rawKeys = rawKeys.replace(/^\[|\]$/g, '');
  return rawKeys.split(',').map(k => k.trim()).filter(k => k.length > 0);
}

const keys = getApiKeys();

// ── Startup guard: crash fast with a clear message ──
if (keys.length === 0) {
  console.error('\n❌ FATAL: No GEMINI_API_KEY found in .env');
  console.error('   Set GEMINI_API_KEY="key1,key2,key3" in server/.env\n');
  process.exit(1);
}

console.log(`[Gemini] Loaded ${keys.length} API key(s)`);

// ── Model name: single source of truth ──
// Use GEMINI_MODEL env var, fall back to the model that is actually working.
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
console.log(`[Gemini] Using model: ${MODEL_NAME}`);

// ── Build LLM instances ──
const llms = keys.map(apiKey => new ChatGoogleGenerativeAI({
  model: MODEL_NAME,
  apiKey,
  temperature: 0.2,
  maxRetries: 0,  // Fail fast so withFallbacks / round-robin can take over
}));

// ── Round-robin key rotation for the main chat LLM ──
let _rrIndex = 0;
function getNextLlm() {
  const instance = llms[_rrIndex % llms.length];
  _rrIndex++;
  return instance;
}

// Primary LLM: use the first key (always valid — we checked keys.length > 0)
const llm = llms[0];

module.exports = {
  llm,
  getNextLlm,
  MODEL_NAME,

  /**
   * Structured output with automatic key fallback.
   * Used by diagnose.js for JSON-schema extraction.
   */
  getStructuredLlm: (schema) => {
    const structuredLlms = llms.map(l => l.withStructuredOutput(schema));
    if (structuredLlms.length > 1) {
      return structuredLlms[0].withFallbacks({ fallbacks: structuredLlms.slice(1) });
    }
    return structuredLlms[0];
  },
};
