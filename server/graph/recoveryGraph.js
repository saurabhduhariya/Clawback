const { StateGraph, END } = require("@langchain/langgraph");
const RecoveryState = require("./state");

const detect = require("./nodes/detect");
const riskScore = require("./nodes/riskScore");
const diagnose = require("./nodes/diagnose");
const checkGuardrails = require("./nodes/checkGuardrails");
const pickStrategy = require("./nodes/pickStrategy");
const execute = require("./nodes/execute");
const simulateResponse = require("./nodes/simulateResponse");
const updateState = require("./nodes/updateState");

function buildRecoveryGraph() {
  const graph = new StateGraph(RecoveryState)
    .addNode("detect", detect)
    .addNode("calculateRiskScore", riskScore)
    .addNode("diagnose", diagnose)
    .addNode("checkGuardrails", checkGuardrails)
    .addNode("pickStrategy", pickStrategy)
    .addNode("execute", execute)
    .addNode("simulateResponse", simulateResponse)
    .addNode("updateState", updateState)

    // Linear flow
    .addEdge("__start__", "detect")
    .addEdge("detect", "calculateRiskScore")
    .addEdge("calculateRiskScore", "diagnose")
    .addEdge("diagnose", "checkGuardrails")

    // CONDITIONAL: guardrails decide whether to proceed or skip
    .addConditionalEdges("checkGuardrails", (state) => {
      return state.guardrailResult.allowed ? "pickStrategy" : "updateState";
    })

    .addEdge("pickStrategy", "execute")
    .addEdge("execute", "simulateResponse")
    .addEdge("simulateResponse", "updateState")
    .addEdge("updateState", END);

  return graph.compile();
}

module.exports = buildRecoveryGraph;
