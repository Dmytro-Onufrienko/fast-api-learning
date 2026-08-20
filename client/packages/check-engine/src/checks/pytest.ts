import type { Manifest } from "../schema.js";
import type { PytestCheck } from "../schema.js";
import type { CheckResult, RawExchange, RunnerConfig } from "../types.js";
import { isNetworkError, UNREACHABLE_MESSAGE } from "../unreachable.js";

interface PytestRunnerResponse {
  outcome: "passed" | "failed" | "error";
  durationMs: number;
  longrepr: string | null;
  nodeId: string;
}

/**
 * Delegates to the dev-only `POST /__runner/pytest` endpoint exposed by the
 * api container. This is required for checks that can't be expressed as a
 * black-box HTTP request or an openapi.json assertion — e.g. "the handler
 * does not block the event loop", which needs to import and inspect the
 * learner's module directly.
 */
export async function runPytestCheck(
  manifest: Manifest,
  check: PytestCheck,
  config: RunnerConfig,
): Promise<CheckResult> {
  const start = performance.now();
  const fetchImpl = config.fetchImpl ?? fetch;
  const url = config.resolveApiPath("/__runner/pytest");
  const requestBody = { lessonId: manifest.id, nodeId: check.file };
  const raw: RawExchange = {
    request: { method: "POST", url, headers: { "content-type": "application/json" }, body: requestBody },
  };

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(requestBody),
    });
  } catch (err) {
    const durationMs = performance.now() - start;
    return {
      name: check.name,
      level: "pytest",
      status: "error",
      durationMs,
      message: isNetworkError(err) ? UNREACHABLE_MESSAGE : `Runner request failed: ${(err as Error).message}`,
      raw,
    };
  }

  const durationMs = performance.now() - start;

  if (!response.ok) {
    const text = await response.text();
    raw.response = { status: response.status, body: text };
    return {
      name: check.name,
      level: "pytest",
      status: "error",
      durationMs,
      message: `Runner returned ${response.status}: ${text}`,
      raw,
    };
  }

  const result = (await response.json()) as PytestRunnerResponse;
  raw.response = { status: response.status, body: result };

  if (result.outcome === "passed") {
    return { name: check.name, level: "pytest", status: "pass", durationMs, raw };
  }

  return {
    name: check.name,
    level: "pytest",
    status: result.outcome === "error" ? "error" : "fail",
    durationMs,
    message: result.longrepr ?? `pytest node "${check.file}" did not pass`,
    raw,
  };
}
