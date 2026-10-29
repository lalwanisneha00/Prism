import {
  METER_TYPES,
  SOURCE_TYPES,
  TERMINALS,
  splitRef,
  terminalsOf,
  type Circuit,
  type CircuitComponent,
} from "@/lib/labs/circuit/model";

/*
 * Electrical checks on a lab circuit before it is shown (syllabus fix, Phase 7C). A circuit that
 * fails goes back to the AI with the problems; a second failure falls back to a labelled diagram.
 */

/** "R1.1" → net number. Terminals joined by wires share a net (a node of the circuit). */
export type Nets = {
  netOf: Map<string, number>;
  /** Every terminal on each net. */
  members: string[][];
};

export function buildNets(circuit: Circuit): Nets {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    let c = x;
    while (parent.get(c) !== r) {
      const next = parent.get(c)!;
      parent.set(c, r);
      c = next;
    }
    return r;
  };
  for (const c of circuit.components)
    for (const t of terminalsOf(c)) parent.set(`${c.id}.${t}`, `${c.id}.${t}`);
  for (const w of circuit.connections) {
    if (!parent.has(w.from) || !parent.has(w.to)) continue;
    parent.set(find(w.from), find(w.to));
  }
  const ids = new Map<string, number>();
  const netOf = new Map<string, number>();
  const members: string[][] = [];
  for (const ref of parent.keys()) {
    const root = find(ref);
    if (!ids.has(root)) {
      ids.set(root, members.length);
      members.push([]);
    }
    const n = ids.get(root)!;
    netOf.set(ref, n);
    members[n].push(ref);
  }
  return { netOf, members };
}

const label = (c: CircuitComponent) => `${c.id} (${c.label})`;

export function circuitProblems(circuit: Circuit): string[] {
  const problems: string[] = [];
  const byId = new Map<string, CircuitComponent>();
  for (const c of circuit.components) {
    if (byId.has(c.id)) problems.push(`components: id "${c.id}" is used twice`);
    byId.set(c.id, c);
    const fixed = terminalsOf(c);
    if (fixed.length === 0)
      problems.push(`components: ${c.id} is a ${c.type}, so list its "pins" (e.g. ["VCC","GND"])`);
  }
  if (problems.length) return problems;

  const used = new Map<string, number>();
  circuit.connections.forEach((w, i) => {
    for (const end of [w.from, w.to]) {
      const { comp, terminal } = splitRef(end);
      const c = byId.get(comp);
      if (!c) problems.push(`connections.${i}: no component "${comp}"`);
      else if (!terminalsOf(c).includes(terminal))
        problems.push(
          `connections.${i}: ${comp} has no terminal "${terminal}" (its terminals: ${terminalsOf(c).join(", ")})`,
        );
      used.set(end, (used.get(end) ?? 0) + 1);
    }
    if (w.from === w.to) problems.push(`connections.${i}: a wire from a terminal to itself`);
  });
  if (problems.length) return problems;

  // No floating terminal: every terminal has a wire (boards and ICs may list spare pins).
  for (const c of circuit.components)
    if (TERMINALS[c.type])
      for (const t of terminalsOf(c))
        if (!used.has(`${c.id}.${t}`))
          problems.push(`${label(c)}: terminal "${t}" is not connected to anything`);

  const nets = buildNets(circuit);
  const netsOf = (c: CircuitComponent) =>
    terminalsOf(c).map((t) => nets.netOf.get(`${c.id}.${t}`)!);

  // Both ends of a two-terminal part on one wire: it is shorted out.
  for (const c of circuit.components) {
    const n = netsOf(c);
    if (n.length === 2 && n[0] === n[1])
      problems.push(`${label(c)}: both terminals are on the same wire, so it is shorted out`);
  }

  // One connected circuit: walk components across shared nets.
  const seen = new Set<string>();
  const queue = [circuit.components[0].id];
  while (queue.length) {
    const id = queue.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const net of netsOf(byId.get(id)!))
      for (const ref of nets.members[net]) {
        const other = splitRef(ref).comp;
        if (!seen.has(other)) queue.push(other);
      }
  }
  const apart = circuit.components.filter((c) => !seen.has(c.id));
  if (apart.length)
    problems.push(
      `the circuit is in separate pieces: ${apart.map(label).join(", ")} ${apart.length === 1 ? "is" : "are"} not joined to the rest`,
    );

  const hasSupply =
    circuit.components.some((c) => SOURCE_TYPES.has(c.type)) ||
    circuit.components.some((c) => c.type === "microcontroller" || c.type === "module");
  if (!hasSupply) problems.push("the circuit has no source (battery, supply or signal generator)");

  // Meters: an ammeter goes in series, a voltmeter in parallel.
  const others = (net: number, self: string) =>
    nets.members[net]
      .filter((ref) => splitRef(ref).comp !== self)
      .map((ref) => byId.get(splitRef(ref).comp)!);
  const sameNets = (a: CircuitComponent, b: CircuitComponent) => {
    const x = netsOf(a).slice().sort();
    const y = netsOf(b).slice().sort();
    return x.length === 2 && y.length === 2 && x[0] === y[0] && x[1] === y[1];
  };
  for (const c of circuit.components) {
    const n = netsOf(c);
    if (n.length !== 2 || n[0] === n[1]) continue;
    if (c.type === "ammeter" || c.type === "galvanometer") {
      const across = circuit.components.find(
        (o) => o.id !== c.id && !METER_TYPES.has(o.type) && sameNets(o, c),
      );
      if (across && SOURCE_TYPES.has(across.type))
        problems.push(
          `${label(c)}: an ammeter straight across ${label(across)} would short it; put it in series`,
        );
      else if (across && c.type === "ammeter")
        problems.push(
          `${label(c)}: it is in parallel with ${label(across)}; an ammeter goes in series`,
        );
    }
    if (c.type === "voltmeter" || c.type === "oscilloscope") {
      for (const net of n) {
        const rest = others(net, c.id);
        // Only one other terminal on this wire, and it is a load: the meter is in series with it.
        if (rest.length === 1 && !SOURCE_TYPES.has(rest[0].type) && !METER_TYPES.has(rest[0].type))
          problems.push(
            `${label(c)}: it is in series with ${label(rest[0])}; a voltmeter goes in parallel (across the part it measures)`,
          );
      }
    }
  }

  // Wiring steps add every wire exactly once.
  const added = new Map<number, number>();
  circuit.wiring.forEach((s, i) => {
    for (const k of s.connections) {
      if (k >= circuit.connections.length)
        problems.push(
          `wiring.${i}: there is no connection ${k} (0 to ${circuit.connections.length - 1})`,
        );
      added.set(k, (added.get(k) ?? 0) + 1);
    }
  });
  const missing = circuit.connections.map((_, k) => k).filter((k) => !added.has(k));
  if (missing.length)
    problems.push(`wiring: connections ${missing.join(", ")} are never added by a wiring step`);
  const twice = [...added].filter(([, n]) => n > 1).map(([k]) => k);
  if (twice.length)
    problems.push(`wiring: connections ${twice.join(", ")} are added more than once`);

  if (circuit.plot) {
    for (const key of ["sweep", "x", "y"] as const) {
      const c = byId.get(circuit.plot[key]);
      if (!c) problems.push(`plot.${key}: no component "${circuit.plot[key]}"`);
      else if (key === "y" && !METER_TYPES.has(c.type))
        problems.push(`plot.y: ${label(c)} is not a meter`);
      else if (key === "x" && !METER_TYPES.has(c.type) && c.id !== circuit.plot.sweep)
        problems.push(`plot.x: use a meter, or the swept component itself`);
    }
  }
  return [...new Set(problems)];
}
