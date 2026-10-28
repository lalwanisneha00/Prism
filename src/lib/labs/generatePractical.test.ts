import { describe, expect, it } from "vitest";
import { fakePracticalBody } from "@/lib/labs/fakePractical";
import { generatePractical } from "@/lib/labs/generatePractical";
import { buildPracticalPrompt } from "@/lib/labs/practicalPrompt";
import { shortlistTemplates } from "@/lib/labs/templates";
import { PRACTICAL_SECTIONS } from "@/components/labs/PracticalView";

const request = {
  subject: { id: "pdeu-physics-lab", name: "Physics Lab", field: "Physics" },
  experiment: { id: "coil", name: "To study the magnetic field along the axis of a coil" },
  theoryTopics: ["Biot-Savart law"],
};
const meta = { subject: "pdeu-physics-lab", chapter: "experiments", topic: "coil", title: "Coil" };
const shortlist = shortlistTemplates(request.experiment);

/** A fake AI that answers each call with the next reply in the list. */
function scripted(...replies: unknown[]) {
  const prompts: string[] = [];
  return {
    prompts,
    generate: async ({ prompt }: { prompt: string }) => {
      prompts.push(prompt);
      const next = replies[Math.min(prompts.length - 1, replies.length - 1)];
      return typeof next === "string" ? next : JSON.stringify(next);
    },
  };
}

describe("practical lesson generator", () => {
  it("accepts a good lesson with all 11 parts and the shortlisted simulation", async () => {
    const { system, prompt } = buildPracticalPrompt(request, [], shortlist);
    const ai = scripted(fakePracticalBody(`${system}\n${prompt}`));
    const lesson = await generatePractical(request, {
      generate: ai.generate,
      sources: [],
      shortlist,
      meta,
    });
    expect(lesson.simulation?.type === "widget" && lesson.simulation.widget).toBe("coil-field");
    expect(lesson.viva.length).toBeGreaterThanOrEqual(5);
    expect(lesson.meta.kind).toBe("practical");
    expect(PRACTICAL_SECTIONS).toHaveLength(11);
    expect(ai.prompts).toHaveLength(1);
  });

  it("sends a simulation outside the shortlist back for repair", async () => {
    const bad = {
      ...fakePracticalBody('"widget":"coil-field"'),
      simulation: { type: "widget", widget: "titration", params: {}, caption: "x" },
    };
    const good = fakePracticalBody('"widget":"coil-field"');
    const ai = scripted(bad, good);
    const lesson = await generatePractical(request, {
      generate: ai.generate,
      sources: [],
      shortlist,
      meta,
    });
    expect(ai.prompts[1]).toContain("not one of the listed templates");
    expect(lesson.simulation?.type).toBe("widget");
  });

  it("drops a broken simulation and a wrong calculation on the last try", async () => {
    const body = fakePracticalBody('"widget":"coil-field"');
    const bad = {
      ...body,
      simulation: { type: "widget", widget: "coil-field", params: { coils: 7 }, caption: "x" },
      calculations: { steps: ["B = 1 T"], check: { expression: "2+2", answer: 5 } },
    };
    const lesson = await generatePractical(request, {
      generate: scripted(bad).generate,
      sources: [],
      shortlist,
      meta,
    });
    expect(lesson.simulation).toBeNull();
    expect(lesson.calculations.check).toBeUndefined();
  });

  it("keeps a simulation chosen before instead of the AI's", async () => {
    const fixed = { type: "phet" as const, sim: "magnets-and-electromagnets", caption: "Try it" };
    const ai = scripted(fakePracticalBody('"widget":"coil-field"'));
    const lesson = await generatePractical(request, {
      generate: ai.generate,
      sources: [],
      shortlist,
      meta,
      fixedSimulation: fixed,
    });
    expect(lesson.simulation).toEqual(fixed);
    expect(ai.prompts[0]).not.toContain("pick the ONE template");
  });

  it("refuses procedure steps that name parts the diagram does not have", async () => {
    const body = fakePracticalBody("");
    const bad = {
      ...body,
      procedure: [{ text: "a", parts: ["nope"] }, { text: "b" }, { text: "c" }],
    };
    await expect(
      generatePractical(request, {
        generate: scripted(bad).generate,
        sources: [],
        shortlist,
        meta,
      }),
    ).rejects.toThrow(/unknown part/);
  });
});
