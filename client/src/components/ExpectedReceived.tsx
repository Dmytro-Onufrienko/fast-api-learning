import { useMemo } from "react";

function format(value: unknown): string {
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * Line-level diff between the expected and received values.
 *
 * The point is that a failure should be readable at a glance: the lines that
 * differ are marked on both sides, so a learner sees *which field* is wrong
 * rather than being handed two JSON dumps to compare by eye.
 */
export function ExpectedReceived({
  expected,
  received,
}: {
  expected: unknown;
  received: unknown;
}) {
  const { expectedLines, receivedLines } = useMemo(() => {
    const e = format(expected).split("\n");
    const r = format(received).split("\n");
    const length = Math.max(e.length, r.length);
    const expectedLines: { text: string; changed: boolean }[] = [];
    const receivedLines: { text: string; changed: boolean }[] = [];
    for (let i = 0; i < length; i++) {
      const el = e[i];
      const rl = r[i];
      const changed = el !== rl;
      if (el !== undefined) expectedLines.push({ text: el, changed });
      if (rl !== undefined) receivedLines.push({ text: rl, changed });
    }
    return { expectedLines, receivedLines };
  }, [expected, received]);

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <Pane title="Expected" tone="pass" lines={expectedLines} />
      <Pane title="Received" tone="fail" lines={receivedLines} />
    </div>
  );
}

function Pane({
  title,
  tone,
  lines,
}: {
  title: string;
  tone: "pass" | "fail";
  lines: { text: string; changed: boolean }[];
}) {
  const border = tone === "pass" ? "border-pass/30" : "border-fail/30";
  const label = tone === "pass" ? "text-pass" : "text-fail";
  const changedBg = tone === "pass" ? "bg-pass/[0.12]" : "bg-fail/[0.12]";

  return (
    <div className={`overflow-hidden rounded border ${border} bg-ink-950/60`}>
      <div className={`border-b ${border} px-2.5 py-1 text-2xs font-semibold uppercase tracking-wider ${label}`}>
        {title}
      </div>
      <pre className="overflow-x-auto p-0 font-mono text-[12.5px] leading-5">
        {lines.map((line, i) => (
          <div
            key={i}
            className={`px-2.5 ${line.changed ? `${changedBg} text-ink-100` : "text-ink-400"}`}
          >
            {line.text === "" ? " " : line.text}
          </div>
        ))}
      </pre>
    </div>
  );
}
