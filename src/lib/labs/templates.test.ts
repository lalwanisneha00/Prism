import { describe, expect, it } from "vitest";
import {
  inShortlist,
  LAB_TEMPLATES,
  shortlistTemplates,
  templatePromptLines,
} from "@/lib/labs/templates";
import { virtualLabFor } from "@/lib/labs/virtualLabs";
import { findPhetSim } from "@/data/phet";
import { isWidgetId } from "@/visuals/registry";

const first = (name: string, course = "") => shortlistTemplates({ name }, course)[0]?.id;

describe("lab template shortlist", () => {
  it("only lists real widgets and PhET simulations", () => {
    for (const t of LAB_TEMPLATES)
      expect(t.kind === "widget" ? isWidgetId(t.id) : Boolean(findPhetSim(t.id)), t.id).toBe(true);
  });

  it("finds the right template for common experiments", () => {
    expect(first("To study the magnetic field along the axis of a coil")).toBe("coil-field");
    expect(first("Study of Bio-Savart’s Law")).toBe("coil-field");
    expect(first("To determine the acceleration due to gravity using a simple pendulum")).toBe(
      "oscillation",
    );
    expect(first("To determine the focal length of a convex lens")).toBe("thin-lens");
    expect(first("To determine the acid value of given oil samples")).toBe("titration");
    expect(first("Parallel and counter flow heat exchangers.")).toBe("heat-exchanger");
    expect(first("Calibration of venturi meter and orifice meter")).toBe("flow-meter");
    expect(first("Demodulation of AM signals")).toBe("modulation");
    expect(first("To study importance of biasing of Transistor.")).toBe("load-line");
    expect(first("Implementation of various types of Queue data structure")).toBe("stack-queue");
  });

  it("matches whole words, not pieces of words", () => {
    // "ask" (amplitude-shift keying) must not match "task"; "scan" not "scanning" by accident.
    expect(shortlistTemplates({ name: "Complete the given task" })).toEqual([]);
    expect(shortlistTemplates({ name: "Agarose gel electrophoresis" })).toEqual([]);
  });

  it("describes each choice for the prompt and recognises a valid pick", () => {
    const list = shortlistTemplates({ name: "magnetic field along the axis of a coil" });
    expect(templatePromptLines(list)).toContain('"widget":"coil-field"');
    expect(inShortlist(list, { type: "widget", widget: "coil-field" })).toBe(true);
    expect(inShortlist(list, { type: "widget", widget: "titration" })).toBe(false);
  });
});

describe("Virtual Labs links", () => {
  it("links a checked page for a matching experiment", () => {
    expect(
      virtualLabFor({ name: "To study the magnetic field along the axis of a coil" })?.url,
    ).toBe("https://em-amrt.vlabs.ac.in/exp/circular-coil-carrying-current/");
    expect(virtualLabFor({ name: "Verification of Thevenin's theorem" })?.url).toContain(
      "thevenin",
    );
  });
  it("gives no link rather than a weak guess", () => {
    expect(
      virtualLabFor({ name: "Agrobacterium mediated transformation of plants." }),
    ).toBeUndefined();
  });
});
