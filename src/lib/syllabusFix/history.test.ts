import { describe, expect, it } from "vitest";
import { formatHistory, historyEntry, markReverted, parseHistory } from "@/lib/syllabusFix/history";

const sample = () =>
  historyEntry({
    at: "2026-10-25T10:00:00.000Z",
    actor: { kind: "script" },
    cause: "001-tree-fields",
    target: { kind: "subject", subject: "pdeu-applied-physics" },
    field: "source",
    oldValue: null,
    newValue: "official_site",
  });

describe("syllabus history", () => {
  it("makes entries that start not reverted, with an id from the time", () => {
    const e = sample();
    expect(e.reverted).toBe(false);
    expect(e.id.startsWith("20261025100000-")).toBe(true);
  });

  it("round-trips through .jsonl", () => {
    const entries = [sample(), sample()];
    const { entries: back, problems } = parseHistory(formatHistory(entries));
    expect(problems).toEqual([]);
    expect(back).toEqual(entries);
  });

  it("reports bad lines instead of skipping them silently", () => {
    const text = `${JSON.stringify(sample())}\nnot json\n{"id":"x"}\n\n`;
    const { entries, problems } = parseHistory(text);
    expect(entries).toHaveLength(1);
    expect(problems).toHaveLength(2);
    expect(problems[0]).toContain("line 2");
  });

  it("marks one entry reverted and leaves the rest alone", () => {
    const [a, b] = [sample(), sample()];
    const out = markReverted([a, b], a.id, "undo-1");
    expect(out[0]).toMatchObject({ reverted: true, revertedBy: "undo-1" });
    expect(out[1]).toEqual(b);
    expect(markReverted(out, a.id, "undo-2")[0].revertedBy).toBe("undo-1");
  });
});
