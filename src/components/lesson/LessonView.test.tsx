import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LessonView } from "@/components/lesson/LessonView";
import { blockTitle, levelLayouts } from "@/data/levelLayouts";
import { availableLevels } from "@/data/levels";
import { sampleLessons } from "@/data/sampleLessons";
import { validateLessonRequest } from "@/lib/lessonRequest";

const lesson = sampleLessons[0];

function render(level: string) {
  const result = validateLessonRequest({
    subject: "em",
    chapter: lesson.meta.chapter,
    topic: lesson.meta.topic,
    level,
    duration: "10",
  });
  if (!result.ok) throw new Error("bad request");
  return renderToStaticMarkup(<LessonView lesson={lesson} request={result.request} />);
}

describe("LessonView", () => {
  it.each(availableLevels.map((l) => l.slug))("puts blocks in the %s order", (slug) => {
    const html = render(slug);
    const positions = levelLayouts[slug].blocks.map((b) => html.indexOf(`id="${b}-title"`));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    for (const b of levelLayouts[slug].blocks)
      expect(html).toContain(blockTitle(slug, b).replace(/&/g, "&amp;").replace(/'/g, "&#x27;"));
  });

  it("typesets maths with KaTeX instead of showing raw LaTeX", () => {
    const html = render("first-encounter");
    expect(html).toContain('class="katex');
    expect(html).not.toContain("$$");
  });

  it("links each section to numbered sources", () => {
    const html = render("first-encounter");
    expect(html).toContain('href="#source-openstax-gauss"');
    expect(html).toContain('id="source-openstax-gauss"');
  });

  it("collapses the explanations for last-minute revision", () => {
    expect(render("last-minute")).toContain("<details");
    expect(render("first-encounter")).not.toContain("<details");
  });
});
