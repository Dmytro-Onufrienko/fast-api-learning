import { useState } from "react";

export interface HintProps {
  hints: string[];
}

/**
 * Progressively revealed hints. Only one "Show hint" affordance is visible
 * at a time, so a learner who wants a nudge doesn't accidentally read the
 * answer.
 */
export function Hint({ hints }: HintProps) {
  const [revealed, setRevealed] = useState(0);

  if (hints.length === 0) return null;

  return (
    <div className="my-6 max-w-prose rounded-md border border-ink-700/70 bg-ink-900/60 p-4">
      <p className="mb-3 text-2xs font-semibold uppercase tracking-wider text-ink-400">
        Hints ({revealed}/{hints.length})
      </p>

      {revealed > 0 ? (
        <ol className="mb-3 list-none space-y-2.5 pl-0">
          {hints.slice(0, revealed).map((hint, i) => (
            <li key={i} className="flex gap-2.5 text-[14px] leading-6 text-ink-300">
              <span className="mt-0.5 shrink-0 font-mono text-2xs text-ink-500">{i + 1}</span>
              <span>{hint}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {revealed < hints.length ? (
        <button
          type="button"
          onClick={() => setRevealed((n) => n + 1)}
          className="rounded border border-ink-600 px-2.5 py-1 text-xs font-medium text-ink-300 transition-colors hover:border-ink-500 hover:text-ink-100"
        >
          {revealed === 0 ? "Show a hint" : "Show next hint"}
        </button>
      ) : (
        <p className="text-2xs text-ink-500">No hints left.</p>
      )}
    </div>
  );
}
