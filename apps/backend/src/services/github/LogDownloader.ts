import { getRepoClient, parseRepoFullName } from "./GithubClient";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import * as zlib from "zlib";

const s3 = new S3Client({ region: process.env.REGION || "us-east-1" });

// ─── Convert GitHub API response data to a string ────────────────────────────
// GitHub's log download endpoints return data in various forms:
//   - ArrayBuffer (binary zip data in most cases)
//   - Buffer (Node.js)
//   - string (already decoded by Octokit in some versions)
//   - Readable stream
// This helper normalizes all of these to a UTF-8 string.

function responseDataToBuffer(data: unknown): Buffer {
  if (Buffer.isBuffer(data)) {
    return data;
  }
  if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }
  if (typeof data === "string") {
    return Buffer.from(data, "utf-8");
  }
  // Fallback: try to coerce
  return Buffer.from(String(data), "utf-8");
}

// ─── Extract text from a zip buffer (GitHub packs logs into a zip) ────────────
// Uses Node's built-in zlib for the common single-entry case, and falls back to
// manual local-file-header parsing for multi-file zips (no external deps).

function extractTextFromZip(buf: Buffer): string {
  // Quick check: is this actually a zip? (PK\x03\x04 magic bytes)
  if (buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) {
    const entries: string[] = [];
    let offset = 0;

    while (offset < buf.length - 4) {
      // Look for local file header signature PK\x03\x04
      if (buf[0 + offset] !== 0x50 || buf[1 + offset] !== 0x4b || buf[2 + offset] !== 0x03 || buf[3 + offset] !== 0x04) {
        break; // No more local file headers
      }

      const compressionMethod = buf.readUInt16LE(offset + 8);
      const compressedSize = buf.readUInt32LE(offset + 18);
      const uncompressedSize = buf.readUInt32LE(offset + 22);
      const fileNameLen = buf.readUInt16LE(offset + 26);
      const extraFieldLen = buf.readUInt16LE(offset + 28);

      const fileName = buf.slice(offset + 30, offset + 30 + fileNameLen).toString("utf-8");
      const dataStart = offset + 30 + fileNameLen + extraFieldLen;
      const compressedData = buf.slice(dataStart, dataStart + compressedSize);

      let fileContent: string;
      try {
        if (compressionMethod === 0) {
          // Stored (no compression)
          fileContent = compressedData.toString("utf-8");
        } else if (compressionMethod === 8) {
          // Deflated — use raw inflate (no zlib header)
          fileContent = zlib.inflateRawSync(compressedData).toString("utf-8");
        } else {
          fileContent = `[Unsupported compression method ${compressionMethod} for ${fileName}]`;
        }
      } catch (err) {
        fileContent = `[Failed to decompress ${fileName}: ${err}]`;
      }

      // Only include non-empty text entries
      if (fileContent.trim().length > 0) {
        entries.push(`=== ${fileName} ===\n${fileContent}`);
      }

      offset = dataStart + compressedSize;
    }

    if (entries.length > 0) {
      return entries.join("\n\n");
    }

    // If zip parsing yielded nothing, fall back to treating as text
    console.warn("[LogDownloader] Zip appeared valid but no entries extracted, falling back to raw text");
  }

  // Not a zip — return as plain text
  return buf.toString("utf-8");
}

export async function downloadWorkflowLogs(
  repoFullName: string,
  runId: number
): Promise<{ logs: string; s3Key: string }> {
  const { owner, repo } = parseRepoFullName(repoFullName);
  const octokit = await getRepoClient(owner, repo);

  // Download logs from GitHub — the API returns a zip archive
  const logsResponse = await octokit.rest.actions.downloadWorkflowRunLogs({
    owner,
    repo,
    run_id: runId,
  });

  // Convert the response data (ArrayBuffer / Buffer / string) to a Buffer
  const rawBuffer = responseDataToBuffer(logsResponse.data);
  console.log(`[LogDownloader] downloadWorkflowRunLogs returned ${rawBuffer.length} bytes (type: ${typeof logsResponse.data})`);

  // Extract text from the zip archive
  const extractedText = extractTextFromZip(rawBuffer);

  // Strip ANSI escape codes for cleaner analysis
  const cleanLogs = stripAnsi(extractedText || "No logs available");
  console.log(`[LogDownloader] Extracted ${cleanLogs.length} chars of clean log text`);

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

      // GitHub API returns log data as ArrayBuffer, Buffer, or string.
      // The job-level log endpoint typically returns plain text (not zipped),
      // but we handle all formats robustly.
      const rawBuffer = responseDataToBuffer(jobLogs);
      console.log(`[LogDownloader] downloadJobLogsForWorkflowRun returned ${rawBuffer.length} bytes for job: ${job.name} (type: ${typeof jobLogs})`);

      // Check if it's a zip or plain text
      let logText: string;
      if (rawBuffer.length >= 4 && rawBuffer[0] === 0x50 && rawBuffer[1] === 0x4b) {
        // It's a zip archive
        logText = extractTextFromZip(rawBuffer);
      } else {
        // Plain text
        logText = rawBuffer.toString("utf-8");
      }

      const cleanLog = stripAnsi(logText);
      console.log(`[LogDownloader] Extracted ${cleanLog.length} chars of logs for job: ${job.name}`);

      logParts.push(`=== Job: ${job.name} (conclusion: ${job.conclusion}) ===\nFailed Steps:\n${failedSteps}\n\n--- Logs ---\n${cleanLog}`);
    } catch (err) {
      console.error(`[LogDownloader] Failed to download logs for job ${job.name} (id: ${job.id}):`, err);
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
