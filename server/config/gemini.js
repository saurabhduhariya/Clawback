const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
require('dotenv').config();

const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-1.5-flash',
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0.2, // Low temperature = more deterministic for finance decisions
});

module.exports = llm;
