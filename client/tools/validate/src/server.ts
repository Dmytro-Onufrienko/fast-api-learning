import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";

import { CLIENT_ROOT, COMPOSE_FILE, CONTENT_DIR, VALIDATE_DIR, WORKSPACE_DIR } from "./paths.ts";

export type Runtime = "docker" | "local";

export interface RunningServer {
  baseUrl: string;
  stop: () => Promise<void>;
  /** Combined stdout/stderr, surfaced when startup fails. */
  logs: () => string;
}

const DOCKER_SERVICE = "server-validate";
const DOCKER_PORT = 8100;
const LOCAL_PORT = 8100;
const READY_TIMEOUT_MS = 120_000;

function run(command: string, args: string[], options: { cwd?: string } = {}): Promise<{ code: number; output: string }> {
  return new Promise((resolve) => {
    // Compose paths in docker-compose.validate.yml are relative to client/.
    const child = spawn(command, args, { cwd: options.cwd ?? CLIENT_ROOT });
    let output = "";
    child.stdout.on("data", (d: Buffer) => (output += d.toString()));
    child.stderr.on("data", (d: Buffer) => (output += d.toString()));
    child.on("close", (code) => resolve({ code: code ?? 1, output }));
  });
}

async function waitForReady(baseUrl: string, logs: () => string): Promise<void> {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  let lastError = "";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/__runner/health`);
      if (response.ok) return;
      lastError = `health returned ${response.status}`;
    } catch (err) {
      lastError = (err as Error).message;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    `API did not become ready at ${baseUrl} within ${READY_TIMEOUT_MS / 1000}s (last error: ${lastError}).\n` +
      `--- server output ---\n${logs()}`,
  );
}

async function startDocker(): Promise<RunningServer> {
  const buildResult = await run("docker", [
    "compose",
    "-f",
    COMPOSE_FILE,
    "up",
    "--build",
    "-d",
    DOCKER_SERVICE,
  ]);
  if (buildResult.code !== 0) {
    throw new Error(`docker compose up failed:\n${buildResult.output}`);
  }

  const baseUrl = `http://127.0.0.1:${DOCKER_PORT}`;

  // Container logs are fetched on demand rather than streamed, so `logs()`
  // returns whatever the last fetch captured.
  let lastLogs = "";
  const refreshLogs = async () => {
    const result = await run("docker", ["compose", "-f", COMPOSE_FILE, "logs", "--no-color", DOCKER_SERVICE]);
    lastLogs = result.output;
    return lastLogs;
  };

  const stop = async () => {
    await run("docker", ["compose", "-f", COMPOSE_FILE, "down", "-v", "--remove-orphans"]);
  };

  try {
    await waitForReady(baseUrl, () => lastLogs);
  } catch (err) {
    const containerLogs = await refreshLogs();
    await stop();
    throw new Error(`${(err as Error).message}\n--- container logs ---\n${containerLogs}`);
  }

  return { baseUrl, stop, logs: () => lastLogs };
}

/**
 * Runs the reference API with `uv` directly on the host instead of in a
 * container. Same code, same dependency manifest — this exists for
 * environments without a Docker daemon (and for a faster inner loop when
 * iterating on a lesson locally).
 */
async function startLocal(): Promise<RunningServer> {
  const venvDir = path.join(VALIDATE_DIR, ".uv-venv");
  const env = {
    ...process.env,
    CONTENT_DIR,
    PYTHONPATH: WORKSPACE_DIR,
    UV_PROJECT_ENVIRONMENT: venvDir,
  };

  const sync = await new Promise<{ code: number; output: string }>((resolve) => {
    const child = spawn("uv", ["sync", "--group", "dev"], { cwd: WORKSPACE_DIR, env });
    let output = "";
    child.stdout.on("data", (d: Buffer) => (output += d.toString()));
    child.stderr.on("data", (d: Buffer) => (output += d.toString()));
    child.on("close", (code) => resolve({ code: code ?? 1, output }));
    child.on("error", (err) => resolve({ code: 1, output: err.message }));
  });
  if (sync.code !== 0) {
    throw new Error(`uv sync failed:\n${sync.output}`);
  }

  let output = "";
  const child: ChildProcess = spawn(
    "uv",
    ["run", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", String(LOCAL_PORT)],
    { cwd: WORKSPACE_DIR, env },
  );
  child.stdout?.on("data", (d: Buffer) => (output += d.toString()));
  child.stderr?.on("data", (d: Buffer) => (output += d.toString()));

  const logs = () => output;
  const baseUrl = `http://127.0.0.1:${LOCAL_PORT}`;

  const stop = async () => {
    if (child.exitCode === null) {
      child.kill("SIGTERM");
      await new Promise((r) => setTimeout(r, 300));
      if (child.exitCode === null) child.kill("SIGKILL");
    }
  };

  try {
    await waitForReady(baseUrl, logs);
  } catch (err) {
    await stop();
    throw err;
  }

  return { baseUrl, stop, logs };
}

export async function startServer(runtime: Runtime): Promise<RunningServer> {
  return runtime === "docker" ? startDocker() : startLocal();
}

export async function dockerAvailable(): Promise<boolean> {
  const result = await run("docker", ["info"]);
  return result.code === 0;
}
