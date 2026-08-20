import { CodeBlock } from "../Code";

export interface DiffProps {
  left: string;
  right: string;
  leftLabel?: string;
  rightLabel?: string;
  leftLang?: string;
  rightLang?: string;
  caption?: string;
}

/**
 * Side-by-side comparison: the familiar TS/Nest form on the left, the Python
 * equivalent on the right. This is the pedagogical centre of the course —
 * every concept is introduced as a translation of something the learner
 * already knows, not as a new thing to memorize.
 *
 * Stacks vertically below `md`, with the labels kept so the two panes stay
 * distinguishable on a narrow screen.
 */
export function Diff({
  left,
  right,
  leftLabel = "TypeScript",
  rightLabel = "Python",
  leftLang = "typescript",
  rightLang = "python",
  caption,
}: DiffProps) {
  return (
    <figure className="my-6">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <CodeBlock code={left} lang={leftLang} label={leftLabel} />
        <CodeBlock code={right} lang={rightLang} label={rightLabel} />
      </div>
      {caption ? (
        <figcaption className="mt-2 text-2xs uppercase tracking-wider text-ink-500">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
