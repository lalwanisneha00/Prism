import type { Circuit, ComponentType } from "@/lib/labs/circuit/model";
import { hits, normal } from "@/lib/labs/text";

/*
 * Which parts a procedure step uses, so its diagram can light them up (syllabus fix, Phase 7C
 * fixes). The lesson may name them ("parts"); when it doesn't (older lessons, or the AI left the
 * list empty) Prism finds them in the step's words: a part's own name, or for circuits the usual
 * words for its kind ("rheostat", "voltmeter", "supply").
 */

/** Everyday words for each kind of circuit part, as lab manuals write them. */
const TYPE_WORDS: Partial<Record<ComponentType, readonly string[]>> = {
  battery: ["battery", "cell"],
  "dc-supply": ["power supply", "dc supply", "supply", "source"],
  "ac-supply": ["ac supply", "mains", "supply", "source"],
  "function-generator": ["function generator", "signal generator"],
  "solar-cell": ["solar cell", "photovoltaic"],
  resistor: ["resistor", "resistance box", "load"],
  rheostat: ["rheostat", "load resistance", "variable resistance", "load"],
  potentiometer: ["potentiometer", "pot"],
  bulb: ["bulb", "lamp"],
  capacitor: ["capacitor"],
  "electrolytic-capacitor": ["capacitor"],
  inductor: ["inductor", "coil"],
  diode: ["diode"],
  led: ["led"],
  zener: ["zener"],
  photodiode: ["photodiode"],
  ammeter: ["ammeter", "milliammeter", "microammeter", "current"],
  voltmeter: ["voltmeter", "millivoltmeter", "voltage"],
  galvanometer: ["galvanometer"],
  oscilloscope: ["oscilloscope", "cro", "dso"],
  switch: ["switch", "key", "plug key"],
  fuse: ["fuse"],
  motor: ["motor"],
  "transistor-npn": ["transistor"],
  "transistor-pnp": ["transistor"],
  transformer: ["transformer"],
  microcontroller: ["board", "microcontroller", "arduino"],
};

/** Words too common to identify a part from its label alone. */
const STOP = new Set([
  "the",
  "and",
  "with",
  "for",
  "set",
  "box",
  "unit",
  "type",
  "range",
  "dc",
  "ac",
]);

/** Whether the step's words name this label (all its distinctive words, or its last noun). */
function namesLabel(text: string, label: string): boolean {
  const words = normal(label.replace(/\(.*?\)/g, " "))
    .trim()
    .split(" ")
    .filter((w) => w.length >= 3 && !STOP.has(w) && !/^\d/.test(w));
  if (words.length === 0) return false;
  if (hits(text, words.join(" "))) return true;
  // "the convex lens" in a step names "Convex lens (f = 20 cm)"; one long word is enough.
  return words.some((w) => w.length >= 5 && hits(text, w));
}

/** Parts of a setup diagram a step uses: the ones it lists, else the ones it names. */
export function setupStepTargets(
  step: { text: string; parts: readonly string[] },
  setup: { parts: readonly { id: string; label: string }[] },
): string[] {
  const ids = new Set(setup.parts.map((p) => p.id));
  const listed = step.parts.filter((p) => ids.has(p));
  if (listed.length) return listed;
  const text = normal(step.text);
  return setup.parts.filter((p) => namesLabel(text, p.label)).map((p) => p.id);
}

/**
 * Circuit components a step uses (ids as in the circuit, e.g. "R1"): the ones it lists (ids are
 * matched without case, since step part ids are lower case), else the ones it names by label or
 * by kind. A kind word only counts when no part was named by label, so "voltage" in "note the
 * voltmeter's voltage" doesn't add every source.
 */
export function circuitStepTargets(
  step: { text: string; parts: readonly string[] },
  circuit: Pick<Circuit, "components">,
): string[] {
  const byLower = new Map(circuit.components.map((c) => [c.id.toLowerCase(), c.id]));
  const listed = step.parts.map((p) => byLower.get(p.toLowerCase())).filter(Boolean) as string[];
  if (listed.length) return [...new Set(listed)];
  const text = normal(step.text);
  // An id written out ("connect R1 to A1").
  const byId = circuit.components.filter((c) => hits(text, c.id)).map((c) => c.id);
  const byLabel = circuit.components.filter((c) => namesLabel(text, c.label)).map((c) => c.id);
  const named = [...new Set([...byId, ...byLabel])];
  if (named.length) return named;
  return circuit.components
    .filter((c) => (TYPE_WORDS[c.type] ?? []).some((w) => hits(text, w)))
    .map((c) => c.id);
}
