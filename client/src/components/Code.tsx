import { useEffect, useState } from "react";
import { highlight } from "../lib/highlighter";

interface CodeBlockProps {
  code: string;
  lang?: string;
  /** Small label rendered in the frame's header, e.g. a filename or "TypeScript". */
  label?: string;
  className?: string;
}

/**
 * Syntax-highlighted code frame. Shiki runs asynchronously, so the raw text
 * is rendered in a monospace face first and swapped for highlighted markup
 * once the grammar has loaded — no layout shift, no spinner.
 */
export function CodeBlock({ code, lang, label, className = "" }: CodeBlockProps) {
  const [html, setHtml] = useState<string | null>(null);

  // Trailing blank lines are an artifact of how the code was embedded (a
  // template literal in MDX, a heredoc), never something the author meant to
  // show — they'd otherwise leave one pane of a <Diff> taller than the other.
  const trimmed = code.replace(/\s+$/, "");

  useEffect(() => {
    let cancelled = false;
    highlight(trimmed, lang)
      .then((result) => {
        if (!cancelled) setHtml(result);
      })
      .catch(() => {
        if (!cancelled) setHtml(null);
      });
    return () => {
      cancelled = true;
    };
  }, [trimmed, lang]);

  return (
    <div
      className={`shiki-frame overflow-hidden rounded-md border border-ink-700/70 bg-ink-900 ${className}`}
    >
      {label ? (
        <div className="flex items-center justify-between border-b border-ink-700/70 bg-ink-850 px-3 py-1.5">
          <span className="font-mono text-2xs uppercase tracking-wider text-ink-400">{label}</span>
        </div>
      ) : null}
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre className="m-0 overflow-x-auto p-3 text-[13px] leading-relaxed">
          <code className="font-mono text-ink-300">{trimmed}</code>
        </pre>
      )}
    </div>
  );
}
