const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
require('dotenv').config();

function getApiKeys() {
  let rawKeys = process.env.GEMINI_API_KEY || '';
  // Remove brackets in case user types [key1,key2,key3]
  rawKeys = rawKeys.replace(/^\[|\]$/g, '');
  return rawKeys.split(',').map(k => k.trim()).filter(k => k.length > 0);
}

const keys = getApiKeys();

async function runWithFallback(operationFn) {
  let lastError;
  
  if (keys.length === 0) {
    throw new Error("No GEMINI_API_KEY found in .env");
  }

  for (let i = 0; i < keys.length; i++) {
    const llm = new ChatGoogleGenerativeAI({
      model: 'gemini-3.5-flash',
      apiKey: keys[i],
      temperature: 0.2,
      maxRetries: 0 // Fail fast on rate limit so we can try the next key!
    });

    try {
      return await operationFn(llm);
    } catch (err) {
      lastError = err;
      const errMsg = err?.message?.toLowerCase() || '';
      
      // Check if it is a rate limit or quota error (429)
      if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('rate limit') || err?.status === 429) {
        console.log(`[Rate Limit] Key ${i+1} failed due to quota. Attempting fallback to next key...`);
        continue; // Try next key
      }
      
      // If it's a different error (e.g. invalid prompt), throw immediately
      throw err;
    }
  }
  
  throw new Error(`All ${keys.length} API keys exhausted due to rate limits! Last error: ${lastError?.message}`);
}

module.exports = { runWithFallback, getApiKeys };
