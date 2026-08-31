const { AgentExecutor, createReactAgent } = require("@langchain/langgraph/prebuilt");
const { llm } = require('./config/gemini');

async function await run() {
  const start = Date.now();
  try {
    const res = await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hi' })
    });
    const data = await res.json();
    console.log(`Time: ${Date.now() - start}ms`);
    console.log(data);
  } catch(e) {
    console.log(e);
  }
}
await run();
