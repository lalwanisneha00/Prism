/*
 * Operating-system, architecture, networking and database models for Wave 2 widgets
 * (V3 · Step 8). Pure and tested in systemsModels.test.ts.
 */

// ---------------------------------------------------------------- CPU scheduling

export type Proc = { id: string; arrival: number; burst: number };
export type Slice = { id: string | null; start: number; end: number };

/** Gantt chart and per-process times for FCFS, non-preemptive SJF or round robin. */
export function schedule(procs: Proc[], algo: "fcfs" | "sjf" | "rr", quantum = 2) {
  const left = Object.fromEntries(procs.map((p) => [p.id, p.burst]));
  const finish: Record<string, number> = {};
  const gantt: Slice[] = [];
  const push = (id: string | null, start: number, end: number) => {
    const last = gantt[gantt.length - 1];
    if (last && last.id === id && last.end === start) last.end = end;
    else gantt.push({ id, start, end });
  };
  let t = 0;
  const byArrival = [...procs].sort((a, b) => a.arrival - b.arrival || a.id.localeCompare(b.id));
  if (algo === "rr") {
    const queue: string[] = [];
    let next = 0;
    const admit = (until: number) => {
      while (next < byArrival.length && byArrival[next].arrival <= until)
        queue.push(byArrival[next++].id);
    };
    admit(0);
    while (Object.keys(finish).length < procs.length) {
      if (!queue.length) {
        const nt = byArrival[next].arrival;
        push(null, t, nt);
        t = nt;
        admit(t);
        continue;
      }
      const id = queue.shift()!;
      const run = Math.min(quantum, left[id]);
      push(id, t, t + run);
      t += run;
      left[id] -= run;
      admit(t);
      if (left[id] > 0) queue.push(id);
      else finish[id] = t;
    }
  } else {
    const pending = [...byArrival];
    while (pending.length) {
      const ready = pending.filter((p) => p.arrival <= t);
      if (!ready.length) {
        const nt = Math.min(...pending.map((p) => p.arrival));
        push(null, t, nt);
        t = nt;
        continue;
      }
      const pick =
        algo === "fcfs"
          ? ready[0]
          : [...ready].sort((a, b) => a.burst - b.burst || a.arrival - b.arrival)[0];
      push(pick.id, t, t + pick.burst);
      t += pick.burst;
      finish[pick.id] = t;
      pending.splice(pending.indexOf(pick), 1);
    }
  }
  const rows = procs.map((p) => {
    const turnaround = finish[p.id] - p.arrival;
    return { id: p.id, finish: finish[p.id], turnaround, waiting: turnaround - p.burst };
  });
  const avg = (k: "turnaround" | "waiting") => rows.reduce((s, r) => s + r[k], 0) / rows.length;
  return { gantt, rows, avgTurnaround: avg("turnaround"), avgWaiting: avg("waiting") };
}

// ---------------------------------------------------------------- page replacement

export type PageAlgo = "fifo" | "lru" | "optimal";

export function pageReplacement(refs: number[], frames: number, algo: PageAlgo) {
  const mem: number[] = [];
  const lastUse = new Map<number, number>();
  const arrived: number[] = [];
  let faults = 0;
  const steps = refs.map((page, i) => {
    let fault = false;
    let evicted: number | null = null;
    if (!mem.includes(page)) {
      fault = true;
      faults++;
      if (mem.length < frames) {
        mem.push(page);
        arrived.push(page);
      } else {
        let victim: number;
        if (algo === "fifo") victim = arrived.shift()!;
        else if (algo === "lru")
          victim = [...mem].sort((a, b) => lastUse.get(a)! - lastUse.get(b)!)[0];
        else {
          const nextUse = (p: number) => {
            const k = refs.indexOf(p, i + 1);
            return k === -1 ? Infinity : k;
          };
          victim = [...mem].sort((a, b) => nextUse(b) - nextUse(a))[0];
        }
        mem[mem.indexOf(victim)] = page;
        if (algo === "fifo") arrived.push(page);
        evicted = victim;
      }
    }
    lastUse.set(page, i);
    return { page, frames: [...mem], fault, evicted };
  });
  return { steps, faults, hits: refs.length - faults };
}

// ---------------------------------------------------------------- banker's algorithm

export function bankersSafety(available: number[], max: number[][], allocation: number[][]) {
  const need = max.map((row, i) => row.map((m, j) => m - allocation[i][j]));
  const work = [...available];
  const finished = max.map(() => false);
  const sequence: number[] = [];
  const steps: { process: number; work: number[] }[] = [];
  let progress = true;
  while (progress) {
    progress = false;
    for (let i = 0; i < max.length; i++) {
      if (!finished[i] && need[i].every((n, j) => n <= work[j])) {
        for (let j = 0; j < work.length; j++) work[j] += allocation[i][j];
        finished[i] = true;
        sequence.push(i);
        steps.push({ process: i, work: [...work] });
        progress = true;
      }
    }
  }
  return { safe: finished.every(Boolean), sequence, need, steps };
}

// ---------------------------------------------------------------- disk scheduling

export function diskSchedule(
  requests: number[],
  head: number,
  algo: "fcfs" | "sstf" | "scan",
  maxCyl = 199,
) {
  let order: number[];
  if (algo === "fcfs") order = [...requests];
  else if (algo === "sstf") {
    const left = [...requests];
    order = [];
    let pos = head;
    while (left.length) {
      left.sort((a, b) => Math.abs(a - pos) - Math.abs(b - pos) || a - b);
      pos = left.shift()!;
      order.push(pos);
    }
  } else {
    // SCAN moving towards higher cylinders first, to the end, then back.
    const up = requests.filter((r) => r >= head).sort((a, b) => a - b);
    const down = requests.filter((r) => r < head).sort((a, b) => b - a);
    order = down.length ? [...up, maxCyl, ...down] : up;
  }
  let pos = head;
  let movement = 0;
  for (const c of order) {
    movement += Math.abs(c - pos);
    pos = c;
  }
  return { order, movement };
}

// ---------------------------------------------------------------- cache mapping

/** Splits an address into tag / index / offset and simulates a cache (LRU within a set). */
export function cacheSim(
  addresses: number[],
  cacheBytes: number,
  blockBytes: number,
  ways: number,
) {
  const blocks = cacheBytes / blockBytes;
  const sets = blocks / ways;
  const offsetBits = Math.log2(blockBytes);
  const indexBits = Math.log2(sets);
  const contents: number[][] = Array.from({ length: sets }, () => []);
  let hits = 0;
  const steps = addresses.map((addr) => {
    const block = Math.floor(addr / blockBytes);
    const set = block % sets;
    const tag = Math.floor(block / sets);
    const line = contents[set];
    const at = line.indexOf(tag);
    const hit = at !== -1;
    if (hit) {
      hits++;
      line.splice(at, 1);
    } else if (line.length === ways) line.shift();
    line.push(tag);
    return { addr, tag, set, offset: addr % blockBytes, hit };
  });
  return { steps, hits, misses: addresses.length - hits, offsetBits, indexBits, sets };
}

// ---------------------------------------------------------------- pipelining

/** 5-stage pipeline timing; a data hazard on instruction i stalls it by `stalls[i]` cycles. */
export const STAGES = ["IF", "ID", "EX", "MEM", "WB"] as const;
export function pipeline(n: number, stalls: number[] = []) {
  const rows: { instr: number; stageAt: Record<number, string> }[] = [];
  let start = 0;
  for (let i = 0; i < n; i++) {
    const stall = stalls[i] ?? 0;
    const at: Record<number, string> = {};
    // IF at `start`, then wait `stall` cycles before ID.
    at[start] = "IF";
    for (let s = 0; s < stall; s++) at[start + 1 + s] = "stall";
    for (let k = 1; k < STAGES.length; k++) at[start + stall + k] = STAGES[k];
    rows.push({ instr: i, stageAt: at });
    start += 1 + stall;
  }
  const cycles = Math.max(...rows.flatMap((r) => Object.keys(r.stageAt).map(Number))) + 1;
  return { rows, cycles, unpipelined: n * STAGES.length, speedup: (n * STAGES.length) / cycles };
}

// ---------------------------------------------------------------- number representation

export function twosComplement(value: number, bits: number): string {
  const v = value < 0 ? (1 << bits) + value : value;
  return v.toString(2).padStart(bits, "0").slice(-bits);
}

export function fromTwosComplement(bitsStr: string): number {
  const n = parseInt(bitsStr, 2);
  return bitsStr[0] === "1" ? n - (1 << bitsStr.length) : n;
}

/** IEEE 754 single precision: sign, exponent and fraction bits of a number. */
export function ieee754(value: number) {
  const view = new DataView(new ArrayBuffer(4));
  view.setFloat32(0, value);
  const bits = view.getUint32(0).toString(2).padStart(32, "0");
  const sign = bits[0];
  const exponent = bits.slice(1, 9);
  const fraction = bits.slice(9);
  return {
    bits,
    sign,
    exponent,
    fraction,
    biasedExponent: parseInt(exponent, 2),
    stored: view.getFloat32(0),
  };
}

/** Booth's multiplication (n-bit), recording A, Q and Q-1 after each cycle. */
export function booth(multiplicand: number, multiplier: number, bits: number) {
  const mask = (1 << bits) - 1;
  let a = 0;
  let q = multiplier & mask;
  let q1 = 0;
  const m = multiplicand & mask;
  const steps: { a: string; q: string; q1: number; op: string }[] = [];
  for (let i = 0; i < bits; i++) {
    const pair = `${q & 1}${q1}`;
    let op = "shift";
    if (pair === "10") {
      a = (a - m) & mask;
      op = "A − M, shift";
    } else if (pair === "01") {
      a = (a + m) & mask;
      op = "A + M, shift";
    }
    // Arithmetic right shift of A, Q, Q-1.
    q1 = q & 1;
    q = ((q >> 1) | ((a & 1) << (bits - 1))) & mask;
    const signBit = a & (1 << (bits - 1));
    a = ((a >> 1) | signBit) & mask;
    steps.push({
      a: a.toString(2).padStart(bits, "0"),
      q: q.toString(2).padStart(bits, "0"),
      q1,
      op,
    });
  }
  const product = fromTwosComplement(
    a.toString(2).padStart(bits, "0") + q.toString(2).padStart(bits, "0"),
  );
  return { steps, product };
}

// ---------------------------------------------------------------- networking

export function subnet(ip: string, prefix: number) {
  const parts = ip.split(".").map(Number);
  const n = ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = (n & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const dotted = (x: number) => [24, 16, 8, 0].map((s) => (x >>> s) & 255).join(".");
  const hosts = prefix >= 31 ? (prefix === 31 ? 2 : 1) : 2 ** (32 - prefix) - 2;
  return {
    mask: dotted(mask),
    network: dotted(network),
    broadcast: dotted(broadcast),
    firstHost: prefix >= 31 ? dotted(network) : dotted(network + 1),
    lastHost: prefix >= 31 ? dotted(broadcast) : dotted(broadcast - 1),
    hosts,
  };
}

/** CRC by binary long division (XOR): the remainder appended to the data. */
export function crc(data: string, generator: string) {
  const r = generator.length - 1;
  const bits = (data + "0".repeat(r)).split("").map(Number);
  const g = generator.split("").map(Number);
  const steps: string[] = [];
  for (let i = 0; i <= bits.length - g.length; i++) {
    if (bits[i] === 1) {
      for (let j = 0; j < g.length; j++) bits[i + j] ^= g[j];
      steps.push(bits.join(""));
    }
  }
  const remainder = bits.slice(-r).join("");
  return { remainder, codeword: data + remainder, steps };
}

/** TCP congestion window per round: slow start to ssthresh, then additive increase; loss halves. */
export function tcpCwnd(rounds: number, ssthresh: number, lossAt: number[] = []) {
  let cwnd = 1;
  let th = ssthresh;
  const out: { round: number; cwnd: number; phase: string }[] = [];
  for (let r = 1; r <= rounds; r++) {
    const phase = cwnd < th ? "slow start" : "congestion avoidance";
    out.push({ round: r, cwnd, phase });
    if (lossAt.includes(r)) {
      th = Math.max(Math.floor(cwnd / 2), 2);
      cwnd = th; // fast recovery (TCP Reno)
    } else cwnd = cwnd < th ? Math.min(cwnd * 2, th) : cwnd + 1;
  }
  return out;
}

/** Sliding-window (Go-Back-N / Selective Repeat) transmissions when one frame is lost once. */
export function arqTransmissions(frames: number, window: number, lost: number, mode: "gbn" | "sr") {
  const sent: number[] = [];
  let base = 0;
  let lostOnce = false;
  while (base < frames) {
    const end = Math.min(base + window, frames);
    let lostHere = -1;
    for (let f = base; f < end; f++) {
      sent.push(f);
      if (f === lost && !lostOnce) {
        lostOnce = true;
        lostHere = f;
      }
    }
    if (lostHere === -1) base = end;
    else if (mode === "gbn") base = lostHere;
    else {
      sent.push(lostHere);
      base = end;
    }
  }
  return { sent, total: sent.length };
}

// ---------------------------------------------------------------- databases

export type Row = Record<string, string | number | null>;

export function join(
  left: Row[],
  right: Row[],
  key: string,
  kind: "inner" | "left" | "right" | "full",
): Row[] {
  const out: Row[] = [];
  const lCols = Object.keys(left[0] ?? {});
  const rCols = Object.keys(right[0] ?? {});
  const nulls = (cols: string[]) =>
    Object.fromEntries(cols.filter((c) => c !== key).map((c) => [c, null]));
  const matchedRight = new Set<number>();
  for (const l of left) {
    const ms = right.map((r, i) => [r, i] as const).filter(([r]) => r[key] === l[key]);
    for (const [r, i] of ms) {
      matchedRight.add(i);
      out.push({ ...l, ...r });
    }
    if (!ms.length && (kind === "left" || kind === "full")) out.push({ ...l, ...nulls(rCols) });
  }
  if (kind === "right" || kind === "full") {
    right.forEach((r, i) => {
      if (!matchedRight.has(i)) out.push({ ...nulls(lCols), [key]: r[key], ...r });
    });
  }
  return out;
}

export type FD = { lhs: string[]; rhs: string[] };

/** Attribute closure X+ under functional dependencies. */
export function closure(attrs: string[], fds: FD[]): string[] {
  const result = new Set(attrs);
  let changed = true;
  while (changed) {
    changed = false;
    for (const fd of fds) {
      if (fd.lhs.every((a) => result.has(a)) && fd.rhs.some((a) => !result.has(a))) {
        fd.rhs.forEach((a) => result.add(a));
        changed = true;
      }
    }
  }
  return [...result].sort();
}

/** All candidate keys of a relation (minimal attribute sets whose closure is everything). */
export function candidateKeys(all: string[], fds: FD[]): string[][] {
  const keys: string[][] = [];
  const n = all.length;
  for (let size = 1; size <= n; size++) {
    for (let mask = 0; mask < 1 << n; mask++) {
      if (bitCount(mask) !== size) continue;
      const set = all.filter((_, i) => mask & (1 << i));
      if (keys.some((k) => k.every((a) => set.includes(a)))) continue;
      if (closure(set, fds).length === n) keys.push(set);
    }
  }
  return keys;
}

function bitCount(x: number): number {
  let c = 0;
  for (; x; x &= x - 1) c++;
  return c;
}

/** Highest normal form (1NF, 2NF, 3NF or BCNF) given the FDs. */
export function normalForm(all: string[], fds: FD[]): "1NF" | "2NF" | "3NF" | "BCNF" {
  const keys = candidateKeys(all, fds);
  const prime = new Set(keys.flat());
  const isSuperkey = (x: string[]) => closure(x, fds).length === all.length;
  const nontrivial = fds.flatMap((fd) =>
    fd.rhs.filter((a) => !fd.lhs.includes(a)).map((a) => ({ lhs: fd.lhs, a })),
  );
  const partial = nontrivial.some(
    ({ lhs, a }) =>
      !prime.has(a) && keys.some((k) => lhs.length < k.length && lhs.every((x) => k.includes(x))),
  );
  if (partial) return "1NF";
  if (nontrivial.some(({ lhs, a }) => !isSuperkey(lhs) && !prime.has(a))) return "2NF";
  if (nontrivial.some(({ lhs }) => !isSuperkey(lhs))) return "3NF";
  return "BCNF";
}

export type Op = { t: string; op: "R" | "W"; item: string };

/** Precedence graph of a schedule and whether it is conflict-serializable. */
export function precedenceGraph(schedule: Op[]) {
  const edges = new Set<string>();
  schedule.forEach((a, i) => {
    for (const b of schedule.slice(i + 1)) {
      if (a.t !== b.t && a.item === b.item && (a.op === "W" || b.op === "W"))
        edges.add(`${a.t}>${b.t}`);
    }
  });
  const list = [...edges].map((e) => e.split(">") as [string, string]);
  const nodes = [...new Set(schedule.map((o) => o.t))].sort();
  // Topological sort: a cycle means not serializable.
  const indeg = Object.fromEntries(nodes.map((n) => [n, 0]));
  for (const [, b] of list) indeg[b]++;
  const order: string[] = [];
  const ready = nodes.filter((n) => indeg[n] === 0);
  while (ready.length) {
    const n = ready.shift()!;
    order.push(n);
    for (const [a, b] of list) if (a === n && --indeg[b] === 0) ready.push(b);
  }
  return { edges: list, serializable: order.length === nodes.length, order };
}
