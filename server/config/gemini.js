const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
require('dotenv').config();

function getApiKeys() {
  let rawKeys = process.env.GEMINI_API_KEY || '';
  rawKeys = rawKeys.replace(/^\[|\]$/g, '');
  return rawKeys.split(',').map(k => k.trim()).filter(k => k.length > 0);
}

const keys = getApiKeys();

if (keys.length === 0) {
  console.error("No GEMINI_API_KEY found in .env");
}

const llms = keys.map(apiKey => new ChatGoogleGenerativeAI({
  model: 'gemini-3.5-flash',
  apiKey: apiKey,
  temperature: 0.2,
  maxRetries: 0 // Crucial: fail fast so withFallbacks can take over immediately
}));

let llm = llms[0];

if (llms.length > 1) {
  llm = llms[0].withFallbacks({
    fallbacks: llms.slice(1)
  });
}

module.exports = llm;
