const { Annotation } = require("@langchain/langgraph");

const RecoveryState = Annotation.Root({
  transactionId: Annotation({ reducer: (_, n) => n, default: () => "" }),
  runId: Annotation({ reducer: (_, n) => n, default: () => 0 }),
  transaction: Annotation({ reducer: (_, n) => n, default: () => null }),
  riskScore: Annotation({ reducer: (_, n) => n, default: () => 0 }),
  diagnosis: Annotation({ reducer: (_, n) => n, default: () => null }),
  guardrailResult: Annotation({ reducer: (_, n) => n, default: () => null }),
  chosenAction: Annotation({ reducer: (_, n) => n, default: () => null }),
  actionReason: Annotation({ reducer: (_, n) => n, default: () => "" }),
  razorpayResponse: Annotation({ reducer: (_, n) => n, default: () => null }),
  simulatedOutcome: Annotation({ reducer: (_, n) => n, default: () => "" }),
  recoveryResult: Annotation({ reducer: (_, n) => n, default: () => "" }),
  auditLog: Annotation({
    reducer: (existing, newEntry) => [...existing, newEntry],
    default: () => [],
  }),
});

module.exports = RecoveryState;
