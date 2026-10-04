import { describe, expect, it } from "vitest";
import {
  arqTransmissions,
  bankersSafety,
  booth,
  cacheSim,
  candidateKeys,
  closure,
  crc,
  diskSchedule,
  fromTwosComplement,
  ieee754,
  join,
  normalForm,
  pageReplacement,
  pipeline,
  precedenceGraph,
  schedule,
  subnet,
  tcpCwnd,
  twosComplement,
} from "@/visuals/wave2/systemsModels";

describe("CPU scheduling", () => {
  const procs = [
    { id: "P1", arrival: 0, burst: 5 },
    { id: "P2", arrival: 1, burst: 3 },
    { id: "P3", arrival: 2, burst: 1 },
  ];
  it("FCFS runs in arrival order", () => {
    const r = schedule(procs, "fcfs");
    expect(r.gantt.map((g) => g.id)).toEqual(["P1", "P2", "P3"]);
    expect(r.avgWaiting).toBeCloseTo((0 + 4 + 6) / 3);
  });
  it("SJF picks the shortest ready job and lowers the waiting time", () => {
    const r = schedule(procs, "sjf");
    expect(r.gantt.map((g) => g.id)).toEqual(["P1", "P3", "P2"]);
    expect(r.avgWaiting).toBeLessThan(schedule(procs, "fcfs").avgWaiting);
  });
  it("round robin shares the CPU in quanta", () => {
    const r = schedule(procs, "rr", 2);
    expect(r.gantt[0]).toEqual({ id: "P1", start: 0, end: 2 });
    expect(r.rows.find((x) => x.id === "P3")!.finish).toBeLessThan(9);
  });
});

describe("memory and disks", () => {
  const refs = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2];
  it("counts page faults (optimal ≤ LRU ≤ FIFO here)", () => {
    const f = pageReplacement(refs, 3, "fifo").faults;
    const l = pageReplacement(refs, 3, "lru").faults;
    const o = pageReplacement(refs, 3, "optimal").faults;
    expect(o).toBeLessThanOrEqual(l);
    expect(l).toBeLessThanOrEqual(f);
    expect(f).toBe(10);
  });
  it("shows Belady's anomaly for FIFO", () => {
    const r = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5];
    expect(pageReplacement(r, 4, "fifo").faults).toBeGreaterThan(
      pageReplacement(r, 3, "fifo").faults,
    );
  });
  it("finds the safe sequence in the classic banker's example", () => {
    const r = bankersSafety(
      [3, 3, 2],
      [
        [7, 5, 3],
        [3, 2, 2],
        [9, 0, 2],
        [2, 2, 2],
        [4, 3, 3],
      ],
      [
        [0, 1, 0],
        [2, 0, 0],
        [3, 0, 2],
        [2, 1, 1],
        [0, 0, 2],
      ],
    );
    expect(r.safe).toBe(true);
    expect(r.sequence[0]).toBe(1);
  });
  it("disk head movement: SSTF beats FCFS", () => {
    const req = [98, 183, 37, 122, 14, 124, 65, 67];
    expect(diskSchedule(req, 53, "fcfs").movement).toBe(640);
    expect(diskSchedule(req, 53, "sstf").movement).toBe(236);
  });
  it("cache hits after the first miss in a block", () => {
    const r = cacheSim([0, 4, 8, 64, 0], 64, 16, 1);
    expect(r.steps.map((s) => s.hit)).toEqual([false, true, true, false, false]);
    expect(r.sets).toBe(4);
  });
  it("pipelines n instructions in n + 4 cycles without hazards", () => {
    expect(pipeline(5).cycles).toBe(9);
    expect(pipeline(5, [0, 2]).cycles).toBe(11);
  });
});

describe("number representation", () => {
  it("two's complement and IEEE 754", () => {
    expect(twosComplement(-5, 8)).toBe("11111011");
    expect(fromTwosComplement("11111011")).toBe(-5);
    const f = ieee754(-6.5);
    expect(f.sign).toBe("1");
    expect(f.biasedExponent).toBe(129);
  });
  it("Booth's algorithm multiplies signed numbers", () => {
    expect(booth(3, -4, 4).product).toBe(-12);
    expect(booth(-3, -2, 4).product).toBe(6);
  });
});

describe("networking", () => {
  it("subnets an address", () => {
    expect(subnet("192.168.10.77", 26)).toMatchObject({
      mask: "255.255.255.192",
      network: "192.168.10.64",
      broadcast: "192.168.10.127",
      hosts: 62,
    });
  });
  it("computes a CRC remainder", () => {
    expect(crc("1101011011", "10011").remainder).toBe("1110");
  });
  it("TCP grows exponentially then linearly and halves on loss", () => {
    const w = tcpCwnd(8, 8, [6]);
    expect(w.map((x) => x.cwnd)).toEqual([1, 2, 4, 8, 9, 10, 5, 6]);
  });
  it("Go-Back-N resends more than Selective Repeat", () => {
    expect(arqTransmissions(8, 4, 2, "gbn").total).toBeGreaterThan(
      arqTransmissions(8, 4, 2, "sr").total,
    );
    expect(arqTransmissions(8, 4, 2, "sr").total).toBe(9);
  });
});

describe("databases", () => {
  const emp = [
    { dept: 1, name: "Asha" },
    { dept: 2, name: "Ravi" },
    { dept: 3, name: "Meena" },
  ];
  const dept = [
    { dept: 1, title: "CSE" },
    { dept: 2, title: "ECE" },
    { dept: 4, title: "ME" },
  ];
  it("joins tables", () => {
    expect(join(emp, dept, "dept", "inner")).toHaveLength(2);
    expect(join(emp, dept, "dept", "left")).toHaveLength(3);
    expect(join(emp, dept, "dept", "full")).toHaveLength(4);
  });
  it("closures, keys and normal forms", () => {
    const fds = [
      { lhs: ["A"], rhs: ["B"] },
      { lhs: ["B"], rhs: ["C"] },
    ];
    expect(closure(["A"], fds)).toEqual(["A", "B", "C"]);
    expect(candidateKeys(["A", "B", "C"], fds)).toEqual([["A"]]);
    expect(normalForm(["A", "B", "C"], fds)).toBe("2NF"); // transitive dependency
    expect(normalForm(["A", "B"], [{ lhs: ["A"], rhs: ["B"] }])).toBe("BCNF");
    expect(normalForm(["A", "B", "C"], [{ lhs: ["A"], rhs: ["C"] }])).toBe("1NF"); // key AB, A→C partial
  });
  it("detects a non-serializable schedule", () => {
    const s = precedenceGraph([
      { t: "T1", op: "R", item: "x" },
      { t: "T2", op: "W", item: "x" },
      { t: "T1", op: "W", item: "x" },
    ]);
    expect(s.serializable).toBe(false);
    const ok = precedenceGraph([
      { t: "T1", op: "W", item: "x" },
      { t: "T2", op: "R", item: "x" },
    ]);
    expect(ok.serializable).toBe(true);
    expect(ok.order).toEqual(["T1", "T2"]);
  });
});
