import type { Manifest } from "./schema.js";
import type { CheckResult, RunnerConfig, ScenarioResult } from "./types.js";
import type { CapturedValues } from "./substitution.js";
import { runHttpCheck } from "./checks/http.js";
import { runOpenApiCheck, resetOpenApiCache } from "./checks/openapi.js";
import { runPytestCheck } from "./checks/pytest.js";
import { UNREACHABLE_MESSAGE } from "./unreachable.js";

/**
 * Runs every check in a lesson's manifest as a single sequential scenario.
 * Sequential (not parallel, not isolated) because checks build on each
 * other: a POST creates a resource, a later check captures its id and
 * references it via {{captured.<name>}}. Once a check errors with an
 * unreachable-api message, remaining checks are short-circuited as errors too
 * rather than each producing their own confusing network failure.
 */
export async function runScenario(manifest: Manifest, config: RunnerConfig): Promise<ScenarioResult> {
  resetOpenApiCache();
  const captured: CapturedValues = {};
  const results: CheckResult[] = [];
  let unreachable = false;

  for (const check of manifest.checks) {
    if (unreachable) {
      results.push({
        name: check.name,
        level: check.level,
        status: "error",
        durationMs: 0,
        message: `Skipped: ${UNREACHABLE_MESSAGE}`,
      });
      continue;
    }

    let result: CheckResult;
    if (check.level === "http") {
      result = await runHttpCheck(manifest, check, config, captured);
    } else if (check.level === "openapi") {
      result = await runOpenApiCheck(manifest, check, config);
    } else {
      result = await runPytestCheck(manifest, check, config);
    }

    results.push(result);
    if (result.status === "error" && result.message === UNREACHABLE_MESSAGE) {
      unreachable = true;
    }
  }

  return { manifestId: manifest.id, results, passed: results.every((r) => r.status === "pass") };
}
