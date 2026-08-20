import type { Manifest, RunnerConfig } from "@learn-fastapi/check-engine";

/**
 * Runner configuration for the browser.
 *
 * Every URL here is same-origin and relative — Vite's dev-server proxy
 * forwards /api, /__runner and /openapi.json to the server container. The
 * browser never learns that a second origin exists, so CORS never comes up.
 */
export const webRunnerConfig: RunnerConfig = {
  // manifest.baseUrl already carries the /api prefix the proxy matches on.
  resolveLessonPath: (manifest: Manifest, path: string) => `${manifest.baseUrl}${path}`,
  resolveApiPath: (path: string) => path,
  timeoutMs: 5000,
};

export interface BootstrapResult {
  created: string[];
  skipped: string[];
}

/**
 * Asks the server container to materialize a lesson's starter files into
 * server/<workdir>/. Safe to call repeatedly — existing files are never
 * overwritten, so a learner's in-progress work is never clobbered.
 */
export async function bootstrapLesson(lessonId: string): Promise<BootstrapResult> {
  const response = await fetch("/__runner/bootstrap", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ lessonId }),
  });
  if (!response.ok) {
    throw new Error(`Bootstrap failed (${response.status}): ${await response.text()}`);
  }
  return (await response.json()) as BootstrapResult;
}

export interface RunnerHealth {
  status: string;
  lessons: number;
}

export async function checkRunnerHealth(): Promise<RunnerHealth> {
  const response = await fetch("/__runner/health");
  if (!response.ok) throw new Error(`Runner health check returned ${response.status}`);
  return (await response.json()) as RunnerHealth;
}
