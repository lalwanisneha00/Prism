import { describe, expect, it } from "vitest";
import { ARCHETYPES, classifyCourse, classifyExperiment } from "@/lib/labs/archetypes";
import { fakeLabReply, fakeLabSections } from "@/lib/labs/fakeLab";
import { generateLab, labProblems } from "@/lib/labs/generateLab";
import { parseLab, sectionsSchema } from "@/lib/labs/labLesson";
import { buildLabPrompt } from "@/lib/labs/labPrompt";
import { labSubjects } from "@/lib/subjects";

const all = [...ARCHETYPES.archetypes, ARCHETYPES.generic];
const lab = (name: string, branches: string[] = [], topics: string[] = []) => ({
  id: "x",
  name,
  branches,
  chapters: [{ topics: topics.map((t, i) => ({ id: `e${i}`, name: t })) }],
});

describe("archetype config", () => {
  it("has the ten archetypes A to J plus a generic one", () => {
    expect(ARCHETYPES.archetypes.map((a) => a.letter).sort()).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "I",
      "J",
    ]);
  });

  it("gives programming labs no aim, apparatus or observation table", () => {
    const kinds = ARCHETYPES.archetypes
      .find((a) => a.id === "programming")!
      .sections.map((s) => s.id);
    expect(kinds).not.toContain("aim");
    expect(kinds).not.toContain("apparatus");
    expect(kinds).not.toContain("observations");
    expect(kinds).toEqual(expect.arrayContaining(["examples", "trace", "practice", "mistakes"]));
  });
});

describe("classifyCourse", () => {
  it.each([
    ["Computer Programming – I Laboratory", "programming"],
    ["Data Structures Laboratory", "programming"],
    ["Database Management Systems Laboratory", "programming"],
    ["Digital Signal Processing Lab", "programming"],
    ["Analog Electronics Lab", "circuit"],
    ["Synchronous and DC Machines Laboratory", "circuit"],
    ["Applied Physics Laboratory", "physics"],
    ["Dynamics of Machines Laboratory", "physics"],
    ["Engineering Chemistry Laboratory", "chemistry"],
    ["General Microbiology Lab", "biology"],
    ["Workshop Practice", "workshop"],
    ["Engineering Graphics", "graphics"],
    ["Material Testing Laboratory", "civil-testing"],
    ["Embedded Systems Lab", "hardware"],
    ["Communication Skills – II", "communication"],
    ["Sedimentary and Petroleum Geology Laboratory", "generic"],
  ])("%s → %s", (name, id) => {
    expect(classifyCourse(lab(name)).archetype.id).toBe(id);
  });

  it("falls back to the experiments' words, then the branch", () => {
    const byExperiments = classifyCourse(
      lab("Lab X", [], ["Chemical reaction rates", "Chemistry of water: hardness"]),
    );
    expect(byExperiments).toMatchObject({ how: "experiments" });
    expect(classifyCourse(lab("Lab Y", ["elec"]))).toMatchObject({ how: "branch" });
  });

  it("classifies every real lab", () => {
    for (const s of labSubjects) expect(all).toContain(classifyCourse(s).archetype);
  });
});

describe("classifyExperiment", () => {
  it("moves a physics lab's circuit experiment to the circuit format and back", () => {
    const physics = lab("Applied Physics Laboratory");
    expect(
      classifyExperiment(physics, {
        id: "e1",
        name: "To study the characteristics of Si solar cells",
      }).archetype.id,
    ).toBe("circuit");
    expect(
      classifyExperiment(physics, {
        id: "e2",
        name: "To determine the wavelength of monochromatic light",
      }).archetype.id,
    ).toBe("physics");
  });
});

describe("every archetype's sample lesson", () => {
  it.each(all.map((a) => [a.id, a] as const))("%s passes its schema and checks", (_, a) => {
    const sections = fakeLabSections(a);
    const parsed = sectionsSchema(a).safeParse(sections);
    expect(parsed.success, JSON.stringify(parsed.error?.issues.slice(0, 3))).toBe(true);
    expect(labProblems(a, parsed.data!, [])).toEqual([]);
  });
});

describe("generateLab", () => {
  const request = {
    subject: { id: "s", name: "Applied Physics Laboratory", field: "Physics" },
    experiment: { id: "e", name: "Ohm's law" },
    theoryTopics: [],
  };
  const circuit = ARCHETYPES.archetypes.find((a) => a.id === "circuit")!;
  const meta = { subject: "s", chapter: "experiments", topic: "e", title: "Ohm's law" };

  it("asks for exactly the archetype's sections and returns a valid lesson", async () => {
    const { system } = buildLabPrompt(request, circuit, [], []);
    expect(system).toContain('"circuit":');
    expect(system).not.toContain('"examples":');
    const out = await generateLab(request, {
      generate: async (o) => fakeLabReply(o.system),
      archetype: circuit,
      sources: [],
      shortlist: [],
      meta,
    });
    expect(out.circuitFallback).toBe(false);
    expect(parseLab(out.lesson).ok).toBe(true);
  });

  it("turns a circuit that is wrong twice into a labelled diagram", async () => {
    const broken = () => {
      const body = JSON.parse(fakeLabReply(`"${circuit.name}" lab`)) as {
        sections: { circuit: { connections: { from: string; to: string }[]; wiring: unknown } };
      };
      // Voltmeter in series with the resistor.
      body.sections.circuit.connections = [
        { from: "B1.+", to: "A1.+" },
        { from: "A1.-", to: "V1.+" },
        { from: "V1.-", to: "R1.1" },
        { from: "R1.2", to: "B1.-" },
      ];
      body.sections.circuit.wiring = [{ text: "all", connections: [0, 1, 2, 3] }];
      return JSON.stringify(body);
    };
    let calls = 0;
    const out = await generateLab(request, {
      generate: async () => {
        calls++;
        return broken();
      },
      archetype: circuit,
      sources: [],
      shortlist: [],
      meta,
    });
    expect(calls).toBe(2);
    expect(out.circuitFallback).toBe(true);
    expect((out.lesson.sections.circuit as { fallback?: boolean }).fallback).toBe(true);
  });

  it("leaves out a simulation whose shape is still wrong on the second try", async () => {
    let calls = 0;
    const out = await generateLab(request, {
      generate: async (o) => {
        calls++;
        const body = JSON.parse(fakeLabReply(o.system)) as { sections: Record<string, unknown> };
        body.sections.simulation = { type: "widget", widget: "newton-rings", params: "oops" };
        return JSON.stringify(body);
      },
      archetype: circuit,
      sources: [],
      shortlist: [],
      meta,
    });
    expect(calls).toBe(2);
    expect(out.lesson.sections.simulation).toBeNull();
  });

  it("gives a chosen simulation without a caption a plain one", () => {
    const parsed = sectionsSchema(circuit).safeParse({
      ...fakeLabSections(circuit),
      simulation: { type: "phet", sim: "faradays-law" },
    });
    expect(parsed.success).toBe(true);
    expect((parsed.data as { simulation: { caption: string } }).simulation.caption).toMatch(
      /values/,
    );
  });
});
