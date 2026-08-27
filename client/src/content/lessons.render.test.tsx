import type { ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { mdxComponents } from "../components/mdx";

/**
 * Renders every lesson.mdx in the course, for real, through the same MDX
 * pipeline the app uses.
 *
 * The gap this closes: `pnpm validate` runs a lesson's checks but never its
 * theory, and MDX compiles any prop name you give it. A lesson written
 * against prop names the components do not have therefore passed every gate
 * in the repo and broke only in the browser — which is how three lessons
 * arrived using `ts`/`py` while `Diff` still expected `left`/`right`.
 *
 * Rendering is the assertion: a component reading a prop that was never
 * passed throws or comes out empty, and both fail here.
 */
const lessons = import.meta.glob("../../content/**/lesson.mdx", {
  eager: true,
}) as Record<string, { default: ComponentType<Record<string, unknown>> }>;

const entries = Object.entries(lessons);

describe("every lesson's theory renders", () => {
  it("finds lessons to render at all", () => {
    // Guards against the glob silently matching nothing, which would make
    // every test below vacuously pass.
    expect(entries.length).toBeGreaterThan(0);
  });

  for (const [path, module] of entries) {
    const name = path.split("/").at(-2) ?? path;

    it(`${name} renders without throwing`, () => {
      const Theory = module.default;
      const html = renderToStaticMarkup(<Theory components={mdxComponents} />);
      expect(html.length).toBeGreaterThan(500);
    });

    it(`${name} passes real content to every component it uses`, () => {
      const Theory = module.default;
      const html = renderToStaticMarkup(<Theory components={mdxComponents} />);

      // An empty pane is what a wrong prop name looks like: the frame renders,
      // the code does not.
      expect(html).not.toMatch(/<code[^>]*>\s*<\/code>/);
      expect(html).not.toContain("undefined");
    });
  }
});
