import { useState } from "react";
import { CodeBlock } from "../Code";

export interface PredictProps {
  code: string;
  lang?: string;
  /** Two to four options, in the order they are shown. */
  options: string[];
  /** Zero-based index into `options`. */
  answer: number;
  explanation?: string;
  question?: string;
}

/**
 * "What does this print?" — a snippet plus multiple choice. The answer and
 * explanation stay locked until a choice is made, because the value is in
 * committing to a prediction first; revealing on hover would defeat it.
 */
export function Predict({
  code,
  lang = "python",
  options,
  answer,
  explanation,
  question = "What does this evaluate to?",
}: PredictProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;
  const correct = selected === answer;

  return (
    <div className="my-6 rounded-md border border-ink-700/70 bg-ink-900/60">
      <p className="border-b border-ink-700/70 px-4 py-2.5 text-2xs font-semibold uppercase tracking-wider text-ink-400">
        Predict — {question}
      </p>

      <div className="p-4">
        <CodeBlock code={code} lang={lang} />

        <ul className="mt-4 list-none space-y-1.5 pl-0" role="radiogroup" aria-label={question}>
          {options.map((option, i) => {
            const isAnswer = i === answer;
            const isSelected = i === selected;

            let tone = "border-ink-700 text-ink-300 hover:border-ink-500 hover:text-ink-100";
            if (answered && isAnswer) tone = "border-pass/60 bg-pass/[0.08] text-ink-100";
            else if (answered && isSelected) tone = "border-fail/60 bg-fail/[0.08] text-ink-100";
            else if (answered) tone = "border-ink-800 text-ink-500";

            return (
              <li key={i}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={answered}
                  onClick={() => setSelected(i)}
                  className={`flex w-full items-center gap-3 rounded border px-3 py-2 text-left font-mono text-[13px] transition-colors disabled:cursor-default ${tone}`}
                >
                  <span className="shrink-0 text-2xs text-ink-500">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1">{option}</span>
                  {answered && isAnswer ? (
                    <span className="shrink-0 text-2xs uppercase tracking-wider text-pass">
                      Correct
                    </span>
                  ) : null}
                  {answered && isSelected && !isAnswer ? (
                    <span className="shrink-0 text-2xs uppercase tracking-wider text-fail">
                      Your answer
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>

        {answered ? (
          <div className="mt-4 border-t border-ink-700/70 pt-3">
            <p
              className={`mb-1.5 text-2xs font-semibold uppercase tracking-wider ${correct ? "text-pass" : "text-fail"}`}
            >
              {correct ? "Correct" : "Not quite"}
            </p>
            {explanation ? (
              <p className="max-w-prose text-[14px] leading-6 text-ink-300">{explanation}</p>
            ) : null}
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mt-3 text-2xs uppercase tracking-wider text-ink-500 underline underline-offset-2 hover:text-ink-300"
            >
              Try again
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
