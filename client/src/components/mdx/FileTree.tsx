import type { ReactNode } from "react";

export interface FileTreeProps {
  /**
   * The tree, written out literally:
   *
   *   <FileTree>{`server/
   *   └─ app/m03/l02/main.py`}</FileTree>
   *
   * Drawing it by hand rather than deriving it from a path list keeps the
   * lesson in control of what is shown — including the parts that do not
   * exist yet, which is often the point.
   */
  children: ReactNode;
}

function asText(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(asText).join("");
  return "";
}

/** Directory layout for a lesson, rendered exactly as the author wrote it. */
export function FileTree({ children }: FileTreeProps) {
  const text = asText(children).replace(/^\n+|\s+$/g, "");
  if (text === "") return null;

  return (
    <div className="my-6 max-w-prose overflow-x-auto rounded-md border border-ink-700/70 bg-ink-900/60 p-4">
      <pre className="m-0 whitespace-pre font-mono text-[13px] leading-6 text-ink-300">{text}</pre>
    </div>
  );
}
