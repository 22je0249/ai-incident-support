import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy-key-for-local-dev" });

const LLM_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const EMBED_MODEL = process.env.GROQ_EMBED_MODEL || "nomic-embed-text-v1_5";

export interface DiagnosisResult {
  rootCause: string;
  resolution: string;
  fixDiff: string;
  confidence: number;
  riskLevel: "low" | "medium" | "high";
  errorType: string;
  reasoning: string;
}

const SYSTEM_PROMPT = `You are an expert Site Reliability Engineer (SRE) specializing in CI/CD pipeline failures and incident diagnosis.

Your task is to analyze build/deployment failure logs and provide a structured diagnosis.

Always respond with valid JSON matching this exact schema:
{
  "rootCause": "A concise, technical description of the root cause (1-2 sentences)",
  "resolution": "Step-by-step resolution instructions",
  "fixDiff": "A unified diff of the exact code/config change needed (empty string if not applicable)",
  "confidence": <integer 0-100>,
  "riskLevel": "low" | "medium" | "high",
  "errorType": "dependency_missing" | "config_error" | "syntax_error" | "env_missing" | "network_error" | "permissions_error" | "timeout" | "test_failure" | "build_error" | "other",
  "reasoning": "Brief explanation of your confidence level and risk assessment"
}

Risk level guidelines:
- low: YAML/config indentation, missing npm package, typo in build script, doc changes
- medium: Dockerfile changes, workflow restructuring, environment variable additions
- high: Database migrations, IAM/permissions, infrastructure deletion, production deployments`;

export async function diagnoseIncident(
  logs: string,
  similarCases: string[],
  repoContext?: { name: string; language?: string; branch: string }
): Promise<DiagnosisResult> {
  if (process.env.MOCK_DB === "true" || !process.env.GROQ_API_KEY) {
    console.log("[GroqService][MOCK] Bypassing Groq LLM diagnosis. Returning mock diagnosis.");
    return {
      rootCause: "Mock diagnosis: A simulated error pattern was detected in the logs.",
      resolution: "Check dependencies in package.json and ensure all modules are properly installed using 'npm install'.",
      fixDiff: `diff --git a/package.json b/package.json
index 123456..789012 100644
--- a/package.json
+++ b/package.json
@@ -10,2 +10,3 @@
     "express": "^4.19.2",
+    "lodash": "^4.17.21"
   }`,
      confidence: 90,
      riskLevel: "low",
      errorType: "dependency_missing",
      reasoning: "Simulated SRE confidence calculation based on mock parameters."
    };
  }
  const contextBlock =
    similarCases.length > 0
      ? `\n\n## Similar Past Resolutions (use these as context):\n${similarCases
          .slice(0, 3)
          .map((c, i) => `### Case ${i + 1}:\n${c}`)
          .join("\n\n---\n\n")}`
      : "";

  const repoBlock = repoContext
    ? `\n\n## Repository Context:\n- Name: ${repoContext.name}\n- Language: ${repoContext.language || "Unknown"}\n- Branch: ${repoContext.branch}`
    : "";

  const truncatedLogs = logs.slice(0, 7000); // stay well within token limits

  const userMessage = `Please diagnose this CI/CD failure:${repoBlock}${contextBlock}

## Failure Logs:
\`\`\`
${truncatedLogs}
\`\`\``;

  const response = await groq.chat.completions.create({
    model: LLM_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    response_format: { type: "json_object" },
    temperature: 0.15,
    max_tokens: 1500,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Groq returned empty response");

  const result = JSON.parse(content) as DiagnosisResult;

  // Clamp confidence to valid range
  result.confidence = Math.max(0, Math.min(100, result.confidence));
  return result;
}

export async function embedText(text: string): Promise<number[]> {
  if (process.env.MOCK_DB === "true" || !process.env.GROQ_API_KEY) {
    return new Array(768).fill(0).map(() => Math.random());
  }
  // Groq embeddings endpoint
  const response = await groq.embeddings.create({
    model: EMBED_MODEL,
    input: text.slice(0, 4096), // nomic-embed max tokens
  });
  return response.data[0].embedding as number[];
}

export async function generateFix(
  diagnosis: DiagnosisResult,
  currentFileContent: string,
  filePath: string
): Promise<string> {
  if (process.env.MOCK_DB === "true" || !process.env.GROQ_API_KEY) {
    return "Mock fix patch diff content";
  }
  const response = await groq.chat.completions.create({
    model: LLM_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are an expert developer. Generate a unified diff patch to fix the issue described. Output ONLY the unified diff, nothing else.",
      },
      {
        role: "user",
        content: `Fix this issue: ${diagnosis.rootCause}\n\nResolution: ${diagnosis.resolution}\n\nFile: ${filePath}\n\nCurrent content:\n\`\`\`\n${currentFileContent.slice(0, 3000)}\n\`\`\``,
      },
    ],
    temperature: 0.1,
    max_tokens: 1000,
  });

  return response.choices[0]?.message?.content || "";
}
