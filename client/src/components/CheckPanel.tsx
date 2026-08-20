import { useCallback, useState } from "react";
import {
  runScenario,
  UNREACHABLE_MESSAGE,
  type CheckResult,
  type Manifest,
  type ScenarioResult,
} from "@learn-fastapi/check-engine";

import { webRunnerConfig } from "../lib/api";
import { useProgress } from "../store/progress";
import { ExpectedReceived } from "./ExpectedReceived";
import { RawExchangePanel } from "./RawExchange";

const LEVEL_LABEL: Record<CheckResult["level"], string> = {
  http: "HTTP",
  openapi: "OpenAPI",
  pytest: "pytest",
};

function StatusDot({ status }: { status: CheckResult["status"] }) {
  const tone =
    status === "pass" ? "bg-pass" : status === "fail" ? "bg-fail" : "bg-warn";
  return <span className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${tone}`} aria-hidden="true" />;
}

function CheckRow({ result }: { result: CheckResult }) {
  const isUnreachable = result.message?.includes(UNREACHABLE_MESSAGE) ?? false;
  const showDiff =
    result.status !== "pass" && (result.expected !== undefined || result.received !== undefined);

  const statusLabel =
    result.status === "pass" ? "Pass" : result.status === "fail" ? "Fail" : "Error";
  const statusTone =
    result.status === "pass" ? "text-pass" : result.status === "fail" ? "text-fail" : "text-warn";

  return (
    <li className="border-b border-ink-800 px-3 py-2.5 last:border-b-0">
      <div className="flex items-start gap-2.5">
        <StatusDot status={result.status} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <span className="text-[13.5px] text-ink-100">{result.name}</span>
            <span className="rounded-sm border border-ink-700 px-1 py-px text-2xs uppercase tracking-wider text-ink-500">
              {LEVEL_LABEL[result.level]}
            </span>
            <span className={`text-2xs font-semibold uppercase tracking-wider ${statusTone}`}>
              {statusLabel}
            </span>
            <span className="ml-auto font-mono text-2xs text-ink-600">
              {result.durationMs.toFixed(0)}ms
            </span>
          </div>

          {result.status !== "pass" && result.message ? (
            <p
              className={`mt-1.5 max-w-prose text-[13px] leading-5 ${isUnreachable ? "text-warn" : "text-ink-400"}`}
            >
              {result.message}
            </p>
          ) : null}

          {result.level === "pytest" && result.status !== "pass" && result.message ? (
            <pre className="mt-2 max-h-72 overflow-auto rounded border border-ink-800 bg-ink-950/60 p-2.5 font-mono text-[12.5px] leading-5 text-ink-400">
              {result.message}
            </pre>
          ) : null}

          {showDiff ? (
            <div className="mt-2.5">
              <ExpectedReceived expected={result.expected} received={result.received} />
            </div>
          ) : null}

          {result.raw ? <RawExchangePanel raw={result.raw} /> : null}
        </div>
      </div>
    </li>
  );
}

export function CheckPanel({ manifest }: { manifest: Manifest }) {
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [running, setRunning] = useState(false);
  const recordRun = useProgress((s) => s.recordRun);

  const run = useCallback(async () => {
    setRunning(true);
    try {
      const scenario = await runScenario(manifest, webRunnerConfig);
      setResult(scenario);
      recordRun(manifest.id, scenario);
    } finally {
      setRunning(false);
    }
  }, [manifest, recordRun]);

  const passed = result?.results.filter((r) => r.status === "pass").length ?? 0;
  const total = result?.results.length ?? manifest.checks.length;
  const unreachable =
    result?.results.some((r) => r.message?.includes(UNREACHABLE_MESSAGE)) ?? false;

  return (
    <section
      aria-label="Checks"
      className="overflow-hidden rounded-md border border-ink-700/70 bg-ink-900"
    >
      <header className="flex flex-wrap items-center gap-3 border-b border-ink-700/70 bg-ink-850 px-3 py-2.5">
        <h2 className="text-2xs font-semibold uppercase tracking-wider text-ink-300">Checks</h2>
        {result ? (
          <span
            className={`text-2xs font-semibold uppercase tracking-wider ${result.passed ? "text-pass" : "text-fail"}`}
          >
            {passed}/{total} passing
          </span>
        ) : (
          <span className="text-2xs uppercase tracking-wider text-ink-500">
            {total} check{total === 1 ? "" : "s"}
          </span>
        )}

        <button
          type="button"
          onClick={run}
          disabled={running}
          className="ml-auto rounded bg-accent px-3 py-1.5 text-xs font-semibold text-ink-950 transition-colors hover:bg-accent/90 disabled:cursor-wait disabled:opacity-60"
        >
          {running ? "Running…" : "Run tests"}
        </button>
      </header>

      {unreachable ? (
        <div className="border-b border-warn/30 bg-warn/[0.07] px-3 py-2.5">
          <p className="text-2xs font-semibold uppercase tracking-wider text-warn">
            API unreachable
          </p>
          <p className="mt-1 max-w-prose text-[13px] leading-5 text-ink-300">
            {UNREACHABLE_MESSAGE} Run <code className="font-mono text-ink-200">docker compose ps</code>{" "}
            to confirm the <code className="font-mono text-ink-200">server</code> service is up, and check
            its logs for a traceback.
          </p>
        </div>
      ) : null}

      {result ? (
        <ul>
          {result.results.map((r, i) => (
            <CheckRow key={`${r.name}-${i}`} result={r} />
          ))}
        </ul>
      ) : (
        <ul>
          {manifest.checks.map((check, i) => (
            <li
              key={`${check.name}-${i}`}
              className="flex items-center gap-2.5 border-b border-ink-800 px-3 py-2.5 last:border-b-0"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink-700" aria-hidden="true" />
              <span className="text-[13.5px] text-ink-400">{check.name}</span>
              <span className="rounded-sm border border-ink-800 px-1 py-px text-2xs uppercase tracking-wider text-ink-600">
                {LEVEL_LABEL[check.level]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
