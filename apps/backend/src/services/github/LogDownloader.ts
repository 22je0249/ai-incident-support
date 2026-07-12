import { getRepoClient, parseRepoFullName } from "./GithubClient";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

const s3 = new S3Client({ region: process.env.REGION || "us-east-1" });

export async function downloadWorkflowLogs(
  repoFullName: string,
  runId: number
): Promise<{ logs: string; s3Key: string }> {
  const { owner, repo } = parseRepoFullName(repoFullName);
  const octokit = await getRepoClient(owner, repo);

  // Download logs zip from GitHub
  const logsResponse = await octokit.rest.actions.downloadWorkflowRunLogs({
    owner,
    repo,
    run_id: runId,
  });

  // GitHub redirects to an S3 presigned URL — fetch the actual content
  const logsText = logsResponse.data as unknown as string;

  // Strip ANSI escape codes for cleaner analysis
  const cleanLogs = stripAnsi(logsText || "No logs available");

  // Upload to S3 for archival
  const s3Key = `logs/${new Date().toISOString().split("T")[0]}/${repoFullName.replace("/", "-")}-${runId}.txt`;

  if (process.env.MOCK_DB === "true" || !process.env.LOGS_BUCKET) {
    console.log(`[LogDownloader][MOCK] Bypassing S3 log upload for key: ${s3Key}`);
  } else {
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.LOGS_BUCKET!,
        Key: s3Key,
        Body: cleanLogs,
        ContentType: "text/plain",
      })
    );
    console.log(`[LogDownloader] Logs stored at s3://${process.env.LOGS_BUCKET}/${s3Key}`);
  }

  return { logs: cleanLogs, s3Key };
}

// ─── Alternative: fetch logs from a direct URL (webhook payload) ──────────────

export async function fetchLogsFromUrl(
  repoFullName: string,
  logsUrl: string
): Promise<string> {
  const { owner, repo } = parseRepoFullName(repoFullName);
  const octokit = await getRepoClient(owner, repo);

  // Use Octokit's request to get logs with auth
  const response = await fetch(logsUrl, {
    headers: {
      Authorization: `token ${(octokit as any).auth}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch logs: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  return stripAnsi(text);
}

// ─── Get failed job logs specifically (more targeted) ────────────────────────

export async function getFailedJobLogs(
  repoFullName: string,
  runId: number
): Promise<string> {
  const { owner, repo } = parseRepoFullName(repoFullName);
  const octokit = await getRepoClient(owner, repo);

  // List jobs for the workflow run
  const { data: jobsData } = await octokit.rest.actions.listJobsForWorkflowRun({
    owner,
    repo,
    run_id: runId,
  });

  const failedJobs = jobsData.jobs.filter((j: { conclusion: string | null }) => j.conclusion === "failure");

  if (failedJobs.length === 0) {
    return "No failed jobs found in this workflow run.";
  }

  const logParts: string[] = [];

  for (const job of failedJobs.slice(0, 2)) {
    // Limit to first 2 failed jobs
    // Add step-level annotations for better AI context
    const failedSteps = (job as any).steps
      ?.filter((s: any) => s.conclusion === "failure")
      ?.map((s: any) => `  Step "${s.name}": ${s.conclusion} (status: ${s.status})`)
      ?.join("\n") || "  No step details available";

    try {
      const { data: jobLogs } = await octokit.rest.actions.downloadJobLogsForWorkflowRun({
        owner,
        repo,
        job_id: job.id,
      });

      // GitHub API returns log data as ArrayBuffer, string, or ReadableStream
      // We need to convert it to a proper string
      let logText: string;
      if (typeof jobLogs === "string") {
        logText = jobLogs;
      } else if (jobLogs instanceof ArrayBuffer || ArrayBuffer.isView(jobLogs)) {
        logText = new TextDecoder("utf-8").decode(jobLogs as ArrayBuffer);
      } else if (typeof jobLogs === "object" && jobLogs !== null) {
        // Could be a Buffer or other object-like
        logText = String(jobLogs);
      } else {
        logText = String(jobLogs);
      }

      const cleanLog = stripAnsi(logText);
      console.log(`[LogDownloader] Downloaded ${cleanLog.length} chars of logs for job: ${job.name}`);

      logParts.push(`=== Job: ${job.name} (conclusion: ${job.conclusion}) ===\nFailed Steps:\n${failedSteps}\n\n--- Logs ---\n${cleanLog}`);
    } catch (err) {
      logParts.push(`=== Job: ${job.name} (conclusion: ${job.conclusion}) ===\nFailed Steps:\n${failedSteps}\n\nFailed to retrieve logs: ${err}`);
    }
  }

  return logParts.join("\n\n");
}

// ─── ANSI escape code stripper ────────────────────────────────────────────────

function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1B\[[0-9;]*[mGKHF]/g, "").replace(/\r\n/g, "\n");
}
