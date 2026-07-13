import { diagnoseIncident, embedText } from "../ai/GroqService";
import { searchSimilar } from "../knowledge/VectorStore";
import { classifyRisk, isAutoFixEligible } from "../incident/RiskClassifier";
import { computeConfidence } from "../ai/ConfidenceCalculator";
import { dbUpdate, Tables } from "../db/DynamoClient";
import { AIDiagnosis, RiskLevel } from "@aiops/types";

export interface DiagnosticContext {
  incidentId: string;
  rawLogs: string;
  repositoryName: string;
  language?: string;
  branch: string;
  changedFiles?: string[];
}

export interface DiagnosticOutput {
  aiDiagnosis: AIDiagnosis;
  confidence: number;
  riskLevel: RiskLevel;
  shouldAutoFix: boolean;
}

export async function runDiagnosticPipeline(
  context: DiagnosticContext
): Promise<DiagnosticOutput> {
  const { incidentId, rawLogs, repositoryName, language, branch, changedFiles = [] } = context;

  console.log(`[DiagnosticEngine] Starting pipeline for incident: ${incidentId}`);

  // Truncate logs keeping both the start (setup context) and the end (where errors happen)
  let truncatedLogs = rawLogs;
  const maxLogLength = 8000;
  if (rawLogs.length > maxLogLength) {
    const keepStart = 1500;
    const keepEnd = maxLogLength - keepStart - 100;
    truncatedLogs = `${rawLogs.slice(0, keepStart)}\n\n... [TRUNCATED ${rawLogs.length - maxLogLength} CHARS] ...\n\n${rawLogs.slice(-keepEnd)}`;
  }

  // Step 1: Embed the actual error context (end of truncated logs) for similarity search
  const logSummary = truncatedLogs.slice(-2000);
  let queryEmbedding: number[] = [];
  let similarResults: Awaited<ReturnType<typeof searchSimilar>> = [];
  let similarityScore = 50; // default if no history

  try {
    queryEmbedding = await embedText(logSummary);
    similarResults = await searchSimilar(queryEmbedding, 0.25, 5); // Lowered threshold to 0.25 to catch shingle hashing similarities

    if (similarResults.length > 0) {
      const rawSim = similarResults[0].similarity;
      // Map raw similarity [0.25, 1.0] onto [80, 100] score range to reflect high relevance of known past case
      similarityScore = Math.round(80 + ((rawSim - 0.25) / 0.75) * 20);
      similarityScore = Math.min(100, Math.max(80, similarityScore));
      console.log(`[DiagnosticEngine] Found ${similarResults.length} similar incidents (raw similarity: ${Math.round(rawSim * 100)}%, scaled score: ${similarityScore}%)`);
    }
  } catch (err) {
    console.warn("[DiagnosticEngine] Vector search failed, continuing without context:", err);
  }

  // Step 2: Build similar cases context for RAG
  const similarCases = similarResults.map(
    (r) =>
      `Title: ${r.metadata.title}\nRoot Cause: ${r.metadata.rootCause}\nResolution: ${r.metadata.resolution}`
  );

  // Step 3: Run Groq LLM diagnosis with RAG context
  const diagnosis = await diagnoseIncident(truncatedLogs, similarCases, {
    name: repositoryName,
    language,
    branch,
  });

  // Step 4: Classify risk (rule-engine overrides LLM)
  const riskLevel = classifyRisk(
    diagnosis.fixDiff || "",
    changedFiles,
    diagnosis.riskLevel as RiskLevel
  );

  // Step 5: Compute historical success rate
  const topMatch = similarResults[0];
  const historicalSuccess = topMatch
    ? Math.min(100, (topMatch.metadata.successCount / 10) * 100)
    : 50;

  // Step 6: Compute final confidence
  const confidence = computeConfidence({
    similarityScore,
    llmConfidence: diagnosis.confidence,
    historicalSuccess,
    riskLevel,
  });

  // Step 7: Build AI diagnosis object
  const aiDiagnosis: AIDiagnosis = {
    rootCause: diagnosis.rootCause,
    resolution: diagnosis.resolution,
    fixDiff: diagnosis.fixDiff,
    confidence,
    riskLevel,
    errorType: diagnosis.errorType,
    reasoning: diagnosis.reasoning,
    similarIncidents: similarResults.slice(0, 3).map((r) => ({
      id: r.dynamo_id,
      title: r.metadata.title,
      resolution: r.metadata.resolution,
      similarity: Math.round(r.similarity * 100),
      successCount: r.metadata.successCount,
    })),
  };

  // Step 8: Update incident in DynamoDB
  await dbUpdate(Tables.INCIDENTS, { id: incidentId }, {
    aiDiagnosis,
    confidence,
    riskLevel,
    rootCause: diagnosis.rootCause,
    errorType: diagnosis.errorType,
    status: "analyzing",
    updatedAt: new Date().toISOString(),
  });

  const shouldAutoFix = isAutoFixEligible(confidence, riskLevel, diagnosis.errorType);

  console.log(
    `[DiagnosticEngine] Complete — confidence: ${confidence}%, risk: ${riskLevel}, autoFix: ${shouldAutoFix}`
  );

  return { aiDiagnosis, confidence, riskLevel, shouldAutoFix };
}
