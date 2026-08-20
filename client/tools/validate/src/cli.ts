#!/usr/bin/env -S node --import tsx
/**
 * `pnpm validate`
 *
 * Brings up the api against every lesson's reference solution, runs every
 * check of every lesson, and exits non-zero if any of them fails. This is
 * what keeps content from rotting: when FastAPI or Pydantic ships a
 * breaking change, CI finds out, not a learner halfway through module 6.
 */
import type { Manifest, RunnerConfig, ScenarioResult } from "@learn-fastapi/check-engine";
import { runScenario } from "@learn-fastapi/check-engine";

import { loadLessons } from "./loadContent.ts";
import { buildWorkspace } from "./workspace.ts";
import { startServer, dockerAvailable, type Runtime } from "./server.ts";
import { reportLesson, reportSummary } from "./report.ts";

interface Options {
  runtime: Runtime | "auto";
  only: string | null;
  keepUp: boolean;
}

function parseArgs(argv: string[]): Options {
  const options: Options = { runtime: "auto", only: null, keepUp: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--runtime") {
      const value = argv[++i];
      if (value !== "docker" && value !== "local" && value !== "auto") {
        throw new Error(`--runtime must be one of: docker, local, auto (received "${value}")`);
      }
      options.runtime = value;
    } else if (arg === "--only") {
      options.only = argv[++i] ?? null;
    } else if (arg === "--keep-up") {
      options.keepUp = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(
        [
          "Usage: pnpm validate [options]",
          "",
          "  --runtime <docker|local|auto>  How to run the reference API. Default: auto",
          "                                 (docker when a daemon is reachable, otherwise uv on the host).",
          "  --only <lesson-id>             Validate a single lesson.",
          "  --keep-up                      Leave the API running after the run (for debugging).",
        ].join("\n"),
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument "${arg}". Try --help.`);
    }
  }
  return options;
}

/**
 * The CLI talks to the server container directly, with no Vite proxy in front
 * of it, so it strips the "/api" prefix that manifests declare for the
 * browser's benefit. Everything else about check execution is identical to
 * what the web app does — same engine, same code path.
 */
function makeRunnerConfig(baseUrl: string): RunnerConfig {
  return {
    resolveLessonPath: (manifest: Manifest, path: string) =>
      `${baseUrl}${manifest.baseUrl.replace(/^\/api/, "")}${path}`,
    resolveApiPath: (path: string) => `${baseUrl}${path}`,
    timeoutMs: 10_000,
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  let lessons = await loadLessons();
  if (options.only) {
    lessons = lessons.filter((l) => l.manifest.id === options.only);
    if (lessons.length === 0) {
      throw new Error(`No lesson with id "${options.only}".`);
    }
  }

  if (lessons.length === 0) {
    console.log("No lessons found under content/ — nothing to validate.");
    return;
  }

  console.log(`Validating ${lessons.length} lesson(s) against their reference solutions.\n`);
  await buildWorkspace(lessons);

  const runtime: Runtime =
    options.runtime === "auto" ? ((await dockerAvailable()) ? "docker" : "local") : options.runtime;
  if (options.runtime === "auto" && runtime === "local") {
    console.log("No Docker daemon reachable — running the reference API with uv on the host.\n");
  }

  const server = await startServer(runtime);
  const config = makeRunnerConfig(server.baseUrl);
  const scenarios: ScenarioResult[] = [];

  try {
    for (const lesson of lessons) {
      const scenario = await runScenario(lesson.manifest, config);
      scenarios.push(scenario);
      reportLesson(lesson.manifest.title, lesson.manifest.id, scenario);
    }
  } finally {
    if (!options.keepUp) {
      await server.stop();
    } else {
      console.log(`API left running at ${server.baseUrl} (--keep-up).\n`);
    }
  }

  const ok = reportSummary(scenarios);
  if (!ok) process.exitCode = 1;
}

main().catch((err: Error) => {
  console.error(`\nvalidate failed: ${err.message}`);
  process.exitCode = 1;
});
