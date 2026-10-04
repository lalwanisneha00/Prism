import { pictureKeys, type Slide, type SlidePlan } from "@/lib/slides/plan";
import type { ImageMap } from "@/lib/slides/pptx";

/*
 * After the pictures are drawn, any picture that could not be drawn must not leave a hole: its
 * slide becomes a plain statement slide with the caption (or goes, if there is nothing to say),
 * so the finished file never has an empty frame. Pure, and tested without a browser.
 */

export type Finalized = { plan: SlidePlan; dropped: string[] };

export function finalizePlan(plan: SlidePlan, images: ImageMap): Finalized {
  const dropped: string[] = [];
  const slides: Slide[] = [];
  for (const slide of plan.slides) {
    const missing = pictureKeys(slide).filter((k) => !images[k]);
    if (missing.length === 0) {
      slides.push(slide);
      continue;
    }
    dropped.push(...missing);
    if (slide.layout === "image") {
      const text = slide.picture.caption || slide.points[0] || slide.title;
      if (!text) continue;
      slides.push({
        id: slide.id,
        layout: "statement",
        label: slide.title.slice(0, 50) || "Visual",
        text: text.slice(0, 190),
        notes: slide.notes,
      });
    } else if (slide.layout === "formula") {
      const formulas = slide.formulas.filter((f) => images[f.key]);
      if (formulas.length > 0) slides.push({ ...slide, formulas });
    } else if (slide.layout === "summary") {
      slides.push({ ...slide, formulas: slide.formulas.filter((f) => images[f.key]) });
    }
  }
  const used = new Set(slides.flatMap(pictureKeys));
  return {
    plan: {
      ...plan,
      slides,
      visuals: Object.fromEntries(Object.entries(plan.visuals).filter(([k]) => used.has(k))),
    },
    dropped,
  };
}
