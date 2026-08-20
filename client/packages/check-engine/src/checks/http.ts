import type { Manifest } from "../schema.js";
import type { HttpCheck } from "../schema.js";
import type { CheckResult, RawExchange, RunnerConfig } from "../types.js";
import type { CapturedValues } from "../substitution.js";
import { substituteDeep, readDotPath } from "../substitution.js";
import { deepMatch } from "../match.js";
import { isNetworkError, UNREACHABLE_MESSAGE } from "../unreachable.js";

async function withTimeout(config: RunnerConfig, fn: (signal: AbortSignal) => Promise<Response>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs ?? 5000);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

function headersToObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

export async function runHttpCheck(
  manifest: Manifest,
  check: HttpCheck,
  config: RunnerConfig,
  captured: CapturedValues,
): Promise<CheckResult> {
  const start = performance.now();
  const fetchImpl = config.fetchImpl ?? fetch;

  const request = substituteDeep(check.request, captured);
  const url = config.resolveLessonPath(manifest, request.path);
  const headers = { "content-type": "application/json", ...(request.headers ?? {}) };
  const hasBody = request.body !== undefined && request.method !== "GET" && request.method !== "DELETE";

  const raw: RawExchange = {
    request: { method: request.method, url, headers, body: hasBody ? request.body : undefined },
  };

  let response: Response;
  try {
    response = await withTimeout(config, (signal) =>
      fetchImpl(url, {
        method: request.method,
        headers,
        body: hasBody ? JSON.stringify(request.body) : undefined,
        signal,
      }),
    );
  } catch (err) {
    const durationMs = performance.now() - start;
    return {
      name: check.name,
      level: "http",
      status: "error",
      durationMs,
      message: isNetworkError(err) ? UNREACHABLE_MESSAGE : `Request failed: ${(err as Error).message}`,
      raw,
    };
  }

  const responseHeaders = headersToObject(response.headers);
  let body: unknown = undefined;
  const text = await response.text();
  if (text.length > 0) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  raw.response = { status: response.status, headers: responseHeaders, body };

  const durationMs = performance.now() - start;
  const failures: string[] = [];
  let expected: unknown;
  let received: unknown;

  if (check.expect.status !== undefined && response.status !== check.expect.status) {
    failures.push(`expected status ${check.expect.status}, received ${response.status}`);
    expected = check.expect.status;
    received = response.status;
  }

  if (check.expect.headerContains) {
    for (const [key, value] of Object.entries(check.expect.headerContains)) {
      const actualValue = responseHeaders[key.toLowerCase()];
      if (!actualValue || !actualValue.includes(value)) {
        failures.push(`expected header "${key}" to contain "${value}", received "${actualValue ?? "<missing>"}"`);
        expected = expected ?? { [key]: value };
        received = received ?? { [key]: actualValue };
      }
    }
  }

  if (check.expect.bodyMatches !== undefined) {
    const result = deepMatch(body, check.expect.bodyMatches, check.expect.exact ?? false);
    if (!result.ok) {
      failures.push(
        `body mismatch at "${result.path}": expected ${JSON.stringify(result.expected)}, received ${JSON.stringify(result.received)}`,
      );
      expected = expected ?? check.expect.bodyMatches;
      received = received ?? body;
    }
  }

  if (check.expect.bodyPredicate) {
    try {
      // eslint-disable-next-line no-new-func -- local dev tool running trusted content, per spec
      const predicate = new Function(`return (${check.expect.bodyPredicate})`)() as (b: unknown) => boolean;
      if (!predicate(body)) {
        failures.push(`bodyPredicate "${check.expect.bodyPredicate}" returned false`);
        expected = expected ?? check.expect.bodyPredicate;
        received = received ?? body;
      }
    } catch (err) {
      failures.push(`bodyPredicate threw: ${(err as Error).message}`);
    }
  }

  if (check.capture) {
    for (const [name, path] of Object.entries(check.capture)) {
      captured[name] = readDotPath({ status: response.status, headers: responseHeaders, body }, path);
    }
  }

  if (failures.length > 0) {
    return {
      name: check.name,
      level: "http",
      status: "fail",
      durationMs,
      message: failures.join("; "),
      expected,
      received,
      raw,
    };
  }

  return { name: check.name, level: "http", status: "pass", durationMs, raw };
}
