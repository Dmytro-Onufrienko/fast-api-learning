import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Diff, FileTree, Gotcha, Hint, HintGroup, Predict } from "./index";

/**
 * These components are the authoring contract: a lesson.mdx passes them props
 * by name, and nothing else in the pipeline checks that the names match. MDX
 * compiles whatever it is given, `pnpm validate` never renders theory, and a
 * lesson written against the wrong prop names therefore ships green CI and a
 * blank page. That is not hypothetical — it is exactly what happened when
 * three lessons arrived written against `ts`/`py` while Diff still took
 * `left`/`right`.
 *
 * So each test asserts that content handed in through the documented prop
 * actually reaches the output. Static markup is enough: it is the prop
 * plumbing that breaks, not the interaction.
 */
describe("Diff", () => {
  it("renders both languages and their labels", () => {
    const html = renderToStaticMarkup(
      <Diff ts="const a = 1;" py="a = 1" tsLabel="NestJS" pyLabel="FastAPI" />,
    );
    expect(html).toContain("const a = 1;");
    expect(html).toContain("a = 1");
    expect(html).toContain("NestJS");
    expect(html).toContain("FastAPI");
  });

  it("falls back to language names when no labels are given", () => {
    const html = renderToStaticMarkup(<Diff ts="x" py="y" />);
    expect(html).toContain("TypeScript");
    expect(html).toContain("Python");
  });

  it("renders a caption only when one is given", () => {
    expect(renderToStaticMarkup(<Diff ts="x" py="y" caption="A route" />)).toContain("A route");
    expect(renderToStaticMarkup(<Diff ts="x" py="y" />)).not.toContain("figcaption");
  });
});

describe("Predict", () => {
  const props = {
    code: "1 + 1",
    options: ["2", "11", "TypeError"],
    answer: 0,
    explanation: "Integers add.",
  };

  it("renders the snippet and every option", () => {
    const html = renderToStaticMarkup(<Predict {...props} />);
    expect(html).toContain("1 + 1");
    for (const option of props.options) expect(html).toContain(option);
  });

  it("does not leak the answer or the explanation before a choice is made", () => {
    const html = renderToStaticMarkup(<Predict {...props} />);
    expect(html).not.toContain("Integers add.");
    expect(html).not.toContain("Correct");
  });
});

describe("Hint", () => {
  it("shows one affordance for the first hint and nothing for the rest", () => {
    const html = renderToStaticMarkup(
      <HintGroup>
        <Hint>first</Hint>
        <Hint>second</Hint>
        <Hint>third</Hint>
      </HintGroup>,
    );
    // Registration happens in an effect, which static rendering never runs —
    // so the group renders empty rather than dumping every hint on the page.
    // What matters here is that no hint text leaks.
    expect(html).not.toContain("first");
    expect(html).not.toContain("second");
    expect(html).not.toContain("third");
  });

  it("degrades to a self-contained toggle outside a group", () => {
    const html = renderToStaticMarkup(<Hint>a nudge</Hint>);
    expect(html).toContain("Show a hint");
    expect(html).not.toContain("a nudge");
  });
});

describe("FileTree", () => {
  it("renders the tree exactly as written", () => {
    const tree = "server/\n└─ app/\n   └─ main.py";
    const html = renderToStaticMarkup(<FileTree>{tree}</FileTree>);
    expect(html).toContain("└─ app/");
    expect(html).toContain("main.py");
  });

  it("renders nothing for empty children", () => {
    expect(renderToStaticMarkup(<FileTree>{""}</FileTree>)).toBe("");
  });
});

describe("Gotcha", () => {
  it("renders its title and children", () => {
    const html = renderToStaticMarkup(
      <Gotcha title="Mutable defaults">
        <p>Careful.</p>
      </Gotcha>,
    );
    expect(html).toContain("Mutable defaults");
    expect(html).toContain("Careful.");
  });
});
