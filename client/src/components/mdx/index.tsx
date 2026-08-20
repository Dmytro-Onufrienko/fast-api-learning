import type { ComponentPropsWithoutRef, ReactElement } from "react";
import { isValidElement } from "react";
import { CodeBlock } from "../Code";
import { Diff } from "./Diff";
import { Gotcha } from "./Gotcha";
import { Predict } from "./Predict";
import { Hint } from "./Hint";
import { FileTree } from "./FileTree";

export { Diff, Gotcha, Predict, Hint, FileTree };

interface CodeElementProps {
  className?: string;
  children?: unknown;
}

/**
 * Replaces MDX's default <pre><code> with a Shiki-highlighted frame, reading
 * the language from the ```lang fence. Falls through to a plain <pre> for
 * anything that isn't a fenced code block.
 */
function Pre(props: ComponentPropsWithoutRef<"pre">) {
  const child = props.children;
  if (!isValidElement(child)) {
    return <pre {...props} />;
  }

  const codeProps = (child as ReactElement<CodeElementProps>).props;
  const code = typeof codeProps.children === "string" ? codeProps.children : null;
  if (code === null) {
    return <pre {...props} />;
  }

  const lang = codeProps.className?.replace(/^language-/, "");
  return <CodeBlock code={code} lang={lang} className="my-5" />;
}

/**
 * Components available in every lesson.mdx without an import. Adding a lesson
 * is writing content, never writing React — see content/README.md.
 */
export const mdxComponents = {
  pre: Pre,
  Diff,
  Gotcha,
  Predict,
  Hint,
  FileTree,
};
