import { App } from "@octokit/app";
import { Octokit } from "@octokit/rest";

let appInstance: App | null = null;

function getApp(): App {
  if (!appInstance) {
    appInstance = new App({
      appId: process.env.GITHUB_APP_ID!,
      privateKey: (process.env.GITHUB_APP_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    });
  }
  return appInstance;
}

export async function getInstallationClient(installationId: number): Promise<Octokit> {
  if (process.env.MOCK_DB === "true" || !process.env.GITHUB_APP_ID) {
    return {} as unknown as Octokit;
  }
  const app = getApp();
  const octokit = await app.getInstallationOctokit(installationId);
  return octokit as unknown as Octokit;
}

export async function getRepoClient(
  owner: string,
  repo: string
): Promise<Octokit> {
  if (process.env.MOCK_DB === "true" || !process.env.GITHUB_APP_ID) {
    console.log(`[GithubClient][MOCK] Bypassing Octokit client creation for ${owner}/${repo}`);
    return {
      rest: {
        actions: {
          downloadWorkflowRunLogs: async () => ({
            data: "Simulated log content for workflow run from mock repository."
          }),
          listJobsForWorkflowRun: async () => ({
            data: {
              jobs: [
                { id: 101, name: "Build & Test", conclusion: "failure" }
              ]
            }
          }),
          downloadJobLogsForWorkflowRun: async () => ({
            data: "Simulated failed job log content."
          })
        },
        repos: {
          get: async () => ({
            data: { name: repo, owner: { login: owner }, language: "TypeScript" }
          })
        }
      }
    } as unknown as Octokit;
  }

  const app = getApp();
  for await (const { installation, octokit } of app.eachInstallation.iterator()) {
    try {
      await (octokit as unknown as Octokit).rest.repos.get({ owner, repo });
      return octokit as unknown as Octokit;
    } catch {
      // Not this installation
    }
  }
  throw new Error(`No installation found for ${owner}/${repo}`);
}

export function parseRepoFullName(fullName: string): { owner: string; repo: string } {
  const [owner, repo] = fullName.split("/");
  return { owner, repo };
}
