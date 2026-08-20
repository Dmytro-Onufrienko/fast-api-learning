import type { CheckResult, ScenarioResult } from "@learn-fastapi/check-engine";

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;

const c = {
  dim: (s: string) => (useColor ? `\x1b[2m${s}\x1b[0m` : s),
  red: (s: string) => (useColor ? `\x1b[31m${s}\x1b[0m` : s),
  green: (s: string) => (useColor ? `\x1b[32m${s}\x1b[0m` : s),
  yellow: (s: string) => (useColor ? `\x1b[33m${s}\x1b[0m` : s),
  bold: (s: string) => (useColor ? `\x1b[1m${s}\x1b[0m` : s),
};

function symbol(status: CheckResult["status"]): string {
  if (status === "pass") return c.green("✓");
  if (status === "fail") return c.red("✕");
  return c.yellow("!");
}

function format(value: unknown): string {
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function reportLesson(title: string, id: string, scenario: ScenarioResult): void {
  const header = `${scenario.passed ? c.green("PASS") : c.red("FAIL")}  ${c.bold(title)} ${c.dim(`(${id})`)}`;
  console.log(header);

  for (const result of scenario.results) {
    const duration = c.dim(`${result.durationMs.toFixed(0)}ms`);
    const level = c.dim(`[${result.level}]`);
    console.log(`  ${symbol(result.status)} ${result.name} ${level} ${duration}`);

    if (result.status !== "pass") {
      if (result.message) {
        for (const line of result.message.split("\n")) {
          console.log(`      ${c.dim(line)}`);
        }
      }
      if (result.expected !== undefined || result.received !== undefined) {
        console.log(`      ${c.green("expected")} ${format(result.expected)}`);
        console.log(`      ${c.red("received")} ${format(result.received)}`);
      }
    }
  }
  console.log("");
}

export function reportSummary(scenarios: ScenarioResult[]): boolean {
  const total = scenarios.reduce((n, s) => n + s.results.length, 0);
  const passed = scenarios.reduce(
    (n, s) => n + s.results.filter((r) => r.status === "pass").length,
    0,
  );
  const failedLessons = scenarios.filter((s) => !s.passed);

  console.log(c.bold("Summary"));
  console.log(
    `  lessons: ${scenarios.length - failedLessons.length}/${scenarios.length} passing`,
  );
  console.log(`  checks:  ${passed}/${total} passing`);

  if (failedLessons.length > 0) {
    console.log("");
    console.log(c.red(`Failing lessons: ${failedLessons.map((s) => s.manifestId).join(", ")}`));
    return false;
  }
  return true;
}
