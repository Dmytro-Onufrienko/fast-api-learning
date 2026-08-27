import { CodeBlock } from "../Code";

export interface DiffProps {
  /** The TypeScript/Nest form the learner already knows. */
  ts: string;
  /** Its FastAPI equivalent. */
  py: string;
  tsLabel?: string;
  pyLabel?: string;
  caption?: string;
}

/**
 * Side-by-side comparison: the familiar TS/Nest form on the left, the Python
 * equivalent on the right. This is the pedagogical centre of the course —
 * every concept is introduced as a translation of something the learner
 * already knows, not as a new thing to memorize.
 *
 * The props are named after the languages rather than the columns: a lesson
 * author writing `ts=` / `py=` cannot silently put Python in the TypeScript
 * pane, and the language for highlighting follows from the prop instead of
 * being a second thing to keep in sync.
 *
 * Stacks vertically below `md`, with the labels kept so the two panes stay
 * distinguishable on a narrow screen.
 */
export function Diff({
  ts,
  py,
  tsLabel = "TypeScript",
  pyLabel = "Python",
  caption,
}: DiffProps) {
  return (
    <figure className="my-6">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <CodeBlock code={ts} lang="typescript" label={tsLabel} />
        <CodeBlock code={py} lang="python" label={pyLabel} />
      </div>
      {caption ? (
        <figcaption className="mt-2 text-2xs uppercase tracking-wider text-ink-500">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
