import { describe, expect, it } from "vitest";
import { sampleLessons } from "@/data/sampleLessons";
import { findSubject } from "@/lib/subjects";
import { loadGoldenSets } from "./golden";
import { lessonText, normalizeForMatch, quotedShare, tierForScore } from "./score";

const sets = loadGoldenSets();
const WAVE1 = [
  "applied-physics",
  "engg-chemistry",
  "basic-electrical",
  "basic-electronics",
  "engg-mechanics",
  "engg-graphics",
  "pps",
  "environmental-science",
];
const WAVE2 = [
  "dsa",
  "discrete-maths",
  "coa",
  "operating-systems",
  "dbms",
  "computer-networks",
  "theory-of-computation",
  "oop",
  "compiler-design",
  "software-engineering",
  "web-technologies",
  "ai-ml",
  "digital-logic",
  "signals-systems",
  "network-theory",
  "analog-electronics",
  "communication-systems",
  "dsp",
  "microprocessors",
  "em-theory",
  "vlsi",
];
const WAVE3 = [
  "electrical-machines",
  "power-systems",
  "power-electronics",
  "control-systems",
  "electrical-measurements",
  "engineering-thermodynamics",
  "heat-transfer",
  "fluid-mechanics",
  "strength-of-materials",
  "theory-of-machines",
  "machine-design",
  "manufacturing-processes",
  "engineering-materials",
  "structural-analysis",
  "surveying",
  "geotechnical-engineering",
  "concrete-rcc-design",
  "hydraulic-engineering",
  "transportation-engineering",
  "environmental-engineering",
  "building-materials",
];
const QUOTED = [...WAVE1, ...WAVE2, ...WAVE3];

describe("golden sets", () => {
  it("only use real topics, with patterns that compile", () => {
    for (const set of sets) {
      const subject = findSubject(set.subject);
      expect(subject, set.subject).toBeDefined();
      const topics = new Map(subject!.chapters.flatMap((c) => c.topics.map((t) => [t.id, c.id])));
      for (const t of set.topics) {
        expect(topics.get(t.topic), `${set.subject}/${t.topic}`).toBe(t.chapter);
        const ids = t.facts.map((f) => f.id);
        expect(new Set(ids).size, `${set.subject}/${t.topic} fact ids`).toBe(ids.length);
        for (const f of t.facts) expect(() => new RegExp(f.pattern, "i")).not.toThrow();
      }
    }
  });

  it("give every Wave 1, 2 and 3 subject at least 12 topics, every fact with a source quote", () => {
    for (const id of QUOTED) {
      const set = sets.find((s) => s.subject === id);
      expect(set, id).toBeDefined();
      const share = quotedShare(set!);
      expect(share.quoted, id).toBe(share.total);
      // Eligible for "tested" if the eval score reaches 85%.
      expect(tierForScore(90, { topics: set!.topics.length, ...share }), id).toBe("tested");
    }
  });

  it("don't count facts that an unrelated lesson (Gauss's law) would already 'state'", () => {
    const text = normalizeForMatch(lessonText(sampleLessons[0]));
    const loose: string[] = [];
    for (const id of QUOTED) {
      for (const t of sets.find((s) => s.subject === id)!.topics) {
        for (const f of t.facts)
          if (new RegExp(f.pattern, "i").test(text)) loose.push(`${id}/${t.topic}/${f.id}`);
      }
    }
    expect(loose).toEqual([]);
  });
});
