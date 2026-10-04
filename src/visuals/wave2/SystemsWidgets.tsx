"use client";

import { useMemo, useState } from "react";
import { Readout, Slider, WidgetShell } from "@/visuals/ui";
import { Graph, Legend, makeGraphScale } from "@/visuals/widgets/math/Graph";
import { Cells, Choice, StepNav, TextField, TraceTable } from "@/visuals/wave2/ui2";
import {
  arqTransmissions,
  bankersSafety,
  booth,
  cacheSim,
  candidateKeys,
  closure,
  crc,
  diskSchedule,
  ieee754,
  join,
  normalForm,
  pageReplacement,
  pipeline,
  precedenceGraph,
  schedule,
  STAGES,
  subnet,
  tcpCwnd,
  twosComplement,
  type FD,
  type Op,
  type PageAlgo,
  type Proc,
} from "@/visuals/wave2/systemsModels";

const PROC_COLORS = ["#3b82f6", "#e1306c", "#10b981", "#f59e0b", "#a855f7", "#14b8a6"];

/** Two's complement and IEEE 754 single precision for a number. */
export function NumberFormat({
  value: v0,
  bits: b0,
  caption,
}: {
  value: number;
  bits: number;
  caption: string;
}) {
  const [value, setValue] = useState(v0);
  const [bits, setBits] = useState(b0);
  const min = -(2 ** (bits - 1));
  const max = 2 ** (bits - 1) - 1;
  const clamped = Math.max(min, Math.min(max, Math.round(value)));
  const f = ieee754(value);
  return (
    <WidgetShell
      title="Number representation"
      caption={caption}
      readouts={
        <>
          <Readout
            label={`${bits}-bit two's complement of ${clamped}`}
            value={twosComplement(clamped, bits)}
          />
          <Readout label="Range" value={`${min} … ${max}`} />
          <Readout
            label="IEEE 754 exponent (bias 127)"
            value={`${f.biasedExponent} → 2^${f.biasedExponent - 127}`}
          />
          <Readout label="Stored float" value={String(f.stored)} />
        </>
      }
      controls={
        <>
          <Slider
            label="Value"
            value={value}
            min={-200}
            max={200}
            step={0.25}
            unit=""
            onChange={setValue}
          />
          <Slider
            label="Integer bits"
            value={bits}
            min={4}
            max={16}
            step={1}
            unit=""
            onChange={setBits}
          />
        </>
      }
    >
      <div className="flex flex-col gap-2 p-3 font-mono text-xs sm:text-sm">
        <span className="text-muted">IEEE 754 single precision:</span>
        <div className="flex flex-wrap gap-0.5">
          {f.bits.split("").map((b, i) => (
            <span
              key={i}
              className={`grid h-6 w-4 place-items-center rounded-sm text-white ${i === 0 ? "bg-[#e1306c]" : i < 9 ? "bg-[#10b981]" : "bg-primary"}`}
            >
              {b}
            </span>
          ))}
        </div>
        <span className="text-muted">sign · exponent (8) · fraction (23)</span>
      </div>
    </WidgetShell>
  );
}

/** Booth's multiplication, cycle by cycle. */
export function BoothWidget({
  multiplicand,
  multiplier,
  bits,
  caption,
}: {
  multiplicand: number;
  multiplier: number;
  bits: number;
  caption: string;
}) {
  const [m, setM] = useState(multiplicand);
  const [q, setQ] = useState(multiplier);
  const lim = 2 ** (bits - 1);
  const r = booth(m, q, bits);
  return (
    <WidgetShell
      title={`Booth's algorithm (${bits}-bit)`}
      caption={caption}
      readouts={
        <>
          <Readout label="Product" value={String(r.product)} />
          <Readout label="Check" value={`${m} × ${q} = ${m * q}`} />
        </>
      }
      controls={
        <>
          <Slider
            label="Multiplicand M"
            value={m}
            min={-lim}
            max={lim - 1}
            step={1}
            unit=""
            onChange={setM}
          />
          <Slider
            label="Multiplier Q"
            value={q}
            min={-lim}
            max={lim - 1}
            step={1}
            unit=""
            onChange={setQ}
          />
        </>
      }
    >
      <TraceTable
        head={["cycle", "operation", "A", "Q", "Q₋₁"]}
        rows={r.steps.map((s, i) => [i + 1, s.op, s.a, s.q, s.q1])}
      />
    </WidgetShell>
  );
}

/** Cache simulation: where each address goes, and hits and misses. */
export function CacheSim({
  addresses,
  cacheBytes,
  blockBytes,
  ways: w0,
  caption,
}: {
  addresses: number[];
  cacheBytes: number;
  blockBytes: number;
  ways: number;
  caption: string;
}) {
  const [ways, setWays] = useState(w0);
  const maxWays = cacheBytes / blockBytes;
  const r = cacheSim(addresses, cacheBytes, blockBytes, Math.min(ways, maxWays));
  return (
    <WidgetShell
      title={
        ways === 1
          ? "Direct-mapped cache"
          : ways >= maxWays
            ? "Fully associative cache"
            : `${ways}-way set-associative cache`
      }
      caption={caption}
      readouts={
        <>
          <Readout
            label="Hit ratio"
            value={`${r.hits}/${addresses.length} = ${((100 * r.hits) / addresses.length).toFixed(0)}%`}
          />
          <Readout
            label="Address split"
            value={`tag | ${r.indexBits} index | ${r.offsetBits} offset bits`}
          />
          <Readout label="Sets" value={String(r.sets)} />
        </>
      }
      controls={
        <Slider
          label="Ways (blocks per set)"
          value={ways}
          min={1}
          max={maxWays}
          step={1}
          unit=""
          onChange={(v) => setWays(2 ** Math.round(Math.log2(v)))}
        />
      }
    >
      <TraceTable
        head={["address", "tag", "set", "offset", "result"]}
        rows={r.steps.map((s) => [s.addr, s.tag, s.set, s.offset, s.hit ? "hit" : "miss"])}
      />
    </WidgetShell>
  );
}

/** A 5-stage instruction pipeline with optional stalls. */
export function PipelineWidget({
  instructions,
  stallAfter,
  caption,
}: {
  instructions: number;
  stallAfter: number;
  caption: string;
}) {
  const [n, setN] = useState(instructions);
  const [stall, setStall] = useState(stallAfter);
  const stalls = Array.from({ length: n }, (_, i) => (i === 1 ? stall : 0));
  const p = pipeline(n, stalls);
  return (
    <WidgetShell
      title="Five-stage pipeline"
      caption={caption}
      readouts={
        <>
          <Readout label="Cycles (pipelined)" value={String(p.cycles)} />
          <Readout label="Cycles (one at a time)" value={String(p.unpipelined)} />
          <Readout label="Speed-up" value={p.speedup.toFixed(2)} />
        </>
      }
      controls={
        <>
          <Slider label="Instructions" value={n} min={2} max={8} step={1} unit="" onChange={setN} />
          <Slider
            label="Stall cycles on instruction 2 (data hazard)"
            value={stall}
            min={0}
            max={3}
            step={1}
            unit=""
            onChange={setStall}
          />
        </>
      }
    >
      <TraceTable
        head={["instr", ...Array.from({ length: p.cycles }, (_, c) => String(c + 1))]}
        rows={p.rows.map((r) => [
          `I${r.instr + 1}`,
          ...Array.from({ length: p.cycles }, (_, c) => r.stageAt[c] ?? ""),
        ])}
      />
      <p className="px-3 pb-2 text-xs text-muted">Stages: {STAGES.join(" → ")}</p>
    </WidgetShell>
  );
}

/** CPU scheduling Gantt chart for FCFS, SJF and round robin. */
export function CpuScheduler({
  processes,
  algorithm,
  quantum: q0,
  caption,
}: {
  processes: Proc[];
  algorithm: "fcfs" | "sjf" | "rr";
  quantum: number;
  caption: string;
}) {
  const [algo, setAlgo] = useState(algorithm);
  const [quantum, setQuantum] = useState(q0);
  const r = schedule(processes, algo, quantum);
  const end = r.gantt.at(-1)?.end ?? 1;
  const color = (id: string | null) =>
    id ? PROC_COLORS[processes.findIndex((p) => p.id === id) % PROC_COLORS.length] : "transparent";
  return (
    <WidgetShell
      title={
        {
          fcfs: "FCFS scheduling",
          sjf: "Shortest job first",
          rr: `Round robin (quantum ${quantum})`,
        }[algo]
      }
      caption={caption}
      readouts={
        <>
          <Readout label="Average waiting time" value={r.avgWaiting.toFixed(2)} />
          <Readout label="Average turnaround" value={r.avgTurnaround.toFixed(2)} />
        </>
      }
      controls={
        <>
          <Choice
            options={["fcfs", "sjf", "rr"] as const}
            value={algo}
            onChange={setAlgo}
            labels={{ fcfs: "FCFS", sjf: "SJF", rr: "Round robin" }}
          />
          {algo === "rr" && (
            <Slider
              label="Time quantum"
              value={quantum}
              min={1}
              max={6}
              step={1}
              unit=""
              onChange={setQuantum}
            />
          )}
        </>
      }
    >
      <div className="flex flex-col gap-2 p-3">
        <div
          className="flex h-10 w-full overflow-hidden rounded-md border border-border"
          role="img"
          aria-label={`Gantt: ${r.gantt.map((g) => `${g.id ?? "idle"} ${g.start}-${g.end}`).join(", ")}`}
        >
          {r.gantt.map((g, i) => (
            <div
              key={i}
              className="grid place-items-center border-r border-white/30 text-xs font-bold text-white"
              style={{
                width: `${((g.end - g.start) / end) * 100}%`,
                background: g.id ? color(g.id) : "var(--surface-2)",
              }}
            >
              {g.id ?? "idle"}
            </div>
          ))}
        </div>
        <div className="flex justify-between font-mono text-xs text-muted">
          {[0, ...r.gantt.map((g) => g.end)].map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
        <TraceTable
          head={["process", "arrival", "burst", "finish", "turnaround", "waiting"]}
          rows={r.rows.map((row) => {
            const p = processes.find((x) => x.id === row.id)!;
            return [row.id, p.arrival, p.burst, row.finish, row.turnaround, row.waiting];
          })}
        />
      </div>
    </WidgetShell>
  );
}

/** Page replacement with FIFO, LRU or the optimal algorithm. */
export function PageReplacement({
  references,
  frames: f0,
  algorithm,
  caption,
}: {
  references: number[];
  frames: number;
  algorithm: PageAlgo;
  caption: string;
}) {
  const [algo, setAlgo] = useState<PageAlgo>(algorithm);
  const [frames, setFrames] = useState(f0);
  const r = pageReplacement(references, frames, algo);
  return (
    <WidgetShell
      title={`Page replacement: ${algo.toUpperCase()}`}
      caption={caption}
      readouts={
        <>
          <Readout label="Page faults" value={String(r.faults)} />
          <Readout label="Hits" value={String(r.hits)} />
          <Readout
            label="Hit ratio"
            value={`${((100 * r.hits) / references.length).toFixed(0)}%`}
          />
        </>
      }
      controls={
        <>
          <Choice
            options={["fifo", "lru", "optimal"] as const}
            value={algo}
            onChange={setAlgo}
            labels={{ fifo: "FIFO", lru: "LRU", optimal: "Optimal" }}
          />
          <Slider
            label="Frames"
            value={frames}
            min={1}
            max={6}
            step={1}
            unit=""
            onChange={setFrames}
          />
        </>
      }
    >
      <TraceTable
        head={["ref", ...Array.from({ length: frames }, (_, i) => `F${i + 1}`), "fault?"]}
        rows={r.steps.map((s) => [
          s.page,
          ...Array.from({ length: frames }, (_, i) => s.frames[i] ?? ""),
          s.fault ? `fault${s.evicted !== null ? ` (out ${s.evicted})` : ""}` : "hit",
        ])}
      />
    </WidgetShell>
  );
}

/** Banker's algorithm safety check. */
export function Bankers({
  available,
  max,
  allocation,
  caption,
}: {
  available: number[];
  max: number[][];
  allocation: number[][];
  caption: string;
}) {
  const r = bankersSafety(available, max, allocation);
  const [i, setI] = useState(r.steps.length - 1);
  return (
    <WidgetShell
      title="Banker's algorithm"
      caption={caption}
      readouts={
        <>
          <Readout label="State" value={r.safe ? "safe" : "unsafe (possible deadlock)"} />
          <Readout
            label="Safe sequence"
            value={r.sequence.map((p) => `P${p}`).join(" → ") || "none"}
          />
        </>
      }
      controls={
        r.steps.length ? (
          <StepNav index={Math.max(0, i)} count={r.steps.length} onChange={setI} />
        ) : undefined
      }
    >
      <TraceTable
        head={["process", "allocation", "max", "need", "finished at step"]}
        rows={max.map((m, p) => [
          `P${p}`,
          allocation[p].join(" "),
          m.join(" "),
          r.need[p].join(" "),
          (() => {
            const k = r.sequence.indexOf(p);
            return k === -1 ? "—" : k <= i ? String(k + 1) : "…";
          })(),
        ])}
      />
      {r.steps.length > 0 && (
        <p className="px-3 pb-3 text-sm">
          Work after P{r.steps[Math.max(0, i)].process}: [{r.steps[Math.max(0, i)].work.join(", ")}]
        </p>
      )}
    </WidgetShell>
  );
}

/** Disk-arm scheduling: FCFS, SSTF and SCAN. */
export function DiskScheduler({
  requests,
  head,
  algorithm,
  caption,
}: {
  requests: number[];
  head: number;
  algorithm: "fcfs" | "sstf" | "scan";
  caption: string;
}) {
  const [algo, setAlgo] = useState(algorithm);
  const r = diskSchedule(requests, head, algo);
  const points = [head, ...r.order];
  const scale = makeGraphScale({ xMin: 0, xMax: 199, yMin: -points.length, yMax: 0.5 });
  return (
    <WidgetShell
      title={`Disk scheduling: ${algo.toUpperCase()}`}
      caption={caption}
      readouts={
        <>
          <Readout label="Total head movement" value={`${r.movement} cylinders`} />
          <Readout label="Order" value={r.order.join(" → ")} />
        </>
      }
      controls={
        <Choice
          options={["fcfs", "sstf", "scan"] as const}
          value={algo}
          onChange={setAlgo}
          labels={{ fcfs: "FCFS", sstf: "SSTF", scan: "SCAN" }}
        />
      }
    >
      <Graph scale={scale} label={`Head path with ${r.movement} cylinders of movement`}>
        <polyline
          points={points.map((c, i) => `${scale.sx(c)},${scale.sy(-i)}`).join(" ")}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={2.5}
        />
        {points.map((c, i) => (
          <circle
            key={i}
            cx={scale.sx(c)}
            cy={scale.sy(-i)}
            r={4}
            fill={i === 0 ? "#e1306c" : "var(--primary)"}
          />
        ))}
      </Graph>
      <Legend
        items={[
          { color: "var(--primary)", label: "cylinder (across) against request order (down)" },
        ]}
      />
    </WidgetShell>
  );
}

/** IPv4 subnet calculator. */
export function SubnetCalc({
  ip: ip0,
  prefix: p0,
  caption,
}: {
  ip: string;
  prefix: number;
  caption: string;
}) {
  const [ip, setIp] = useState(ip0);
  const [prefix, setPrefix] = useState(p0);
  const valid = /^(\d{1,3}\.){3}\d{1,3}$/.test(ip) && ip.split(".").every((x) => Number(x) <= 255);
  const s = valid ? subnet(ip, prefix) : null;
  return (
    <WidgetShell
      title={`Subnet ${ip}/${prefix}`}
      caption={caption}
      readouts={
        s ? (
          <>
            <Readout label="Mask" value={s.mask} />
            <Readout label="Network" value={s.network} />
            <Readout label="Broadcast" value={s.broadcast} />
            <Readout label="Usable hosts" value={`${s.hosts} (${s.firstHost} – ${s.lastHost})`} />
          </>
        ) : (
          <Readout label="Address" value="not a valid IPv4 address" />
        )
      }
      controls={
        <>
          <TextField label="IPv4 address" value={ip} onChange={setIp} />
          <Slider
            label="Prefix length"
            value={prefix}
            min={8}
            max={32}
            step={1}
            unit="bits"
            onChange={setPrefix}
          />
        </>
      }
    >
      <div className="flex flex-wrap gap-0.5 p-3 font-mono text-xs">
        {Array.from({ length: 32 }, (_, i) => (
          <span
            key={i}
            className={`grid h-6 w-4 place-items-center rounded-sm ${i < prefix ? "bg-primary text-primary-fg" : "bg-surface-2"}`}
          >
            {i < prefix ? "N" : "H"}
          </span>
        ))}
      </div>
    </WidgetShell>
  );
}

/** CRC by modulo-2 division. */
export function CrcWidget({
  data: d0,
  generator,
  caption,
}: {
  data: string;
  generator: string;
  caption: string;
}) {
  const [data, setData] = useState(d0);
  const clean = data.replace(/[^01]/g, "");
  const r = crc(clean || "0", generator);
  return (
    <WidgetShell
      title={`CRC with generator ${generator}`}
      caption={caption}
      readouts={
        <>
          <Readout label="Remainder (CRC)" value={r.remainder} />
          <Readout label="Transmitted codeword" value={r.codeword} />
        </>
      }
      controls={<TextField label="Data bits" value={data} onChange={setData} />}
    >
      <TraceTable head={["XOR step", "bits after XOR"]} rows={r.steps.map((s, i) => [i + 1, s])} />
    </WidgetShell>
  );
}

/** TCP congestion window: slow start, congestion avoidance and a loss. */
export function TcpCongestion({
  ssthresh: t0,
  lossRound: l0,
  caption,
}: {
  ssthresh: number;
  lossRound: number;
  caption: string;
}) {
  const [th, setTh] = useState(t0);
  const [loss, setLoss] = useState(l0);
  const w = tcpCwnd(20, th, loss ? [loss] : []);
  const max = Math.max(...w.map((x) => x.cwnd)) + 2;
  const scale = makeGraphScale({ xMin: 1, xMax: 20, yMin: 0, yMax: max });
  return (
    <WidgetShell
      title="TCP congestion window"
      caption={caption}
      readouts={
        <>
          <Readout label="Peak window" value={`${Math.max(...w.map((x) => x.cwnd))} segments`} />
          <Readout label="ssthresh" value={String(th)} />
        </>
      }
      controls={
        <>
          <Slider
            label="Initial ssthresh"
            value={th}
            min={2}
            max={32}
            step={1}
            unit=""
            onChange={setTh}
          />
          <Slider
            label="Loss at round (0 = none)"
            value={loss}
            min={0}
            max={20}
            step={1}
            unit=""
            onChange={setLoss}
          />
        </>
      }
    >
      <Graph scale={scale} label="Congestion window against round">
        <polyline
          points={w.map((x) => `${scale.sx(x.round)},${scale.sy(x.cwnd)}`).join(" ")}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={3}
        />
        {w.map((x) => (
          <circle
            key={x.round}
            cx={scale.sx(x.round)}
            cy={scale.sy(x.cwnd)}
            r={3.5}
            fill={x.phase === "slow start" ? "#e1306c" : "#10b981"}
          />
        ))}
      </Graph>
      <Legend
        items={[
          { color: "#e1306c", label: "slow start (doubles)" },
          { color: "#10b981", label: "congestion avoidance (+1)" },
        ]}
      />
    </WidgetShell>
  );
}

/** Go-Back-N against Selective Repeat when one frame is lost. */
export function ArqWindow({
  frames,
  window: w0,
  lostFrame,
  caption,
}: {
  frames: number;
  window: number;
  lostFrame: number;
  caption: string;
}) {
  const [win, setWin] = useState(w0);
  const [lost, setLost] = useState(lostFrame);
  const gbn = arqTransmissions(frames, win, lost, "gbn");
  const sr = arqTransmissions(frames, win, lost, "sr");
  return (
    <WidgetShell
      title="Sliding window ARQ"
      caption={caption}
      readouts={
        <>
          <Readout label="Go-Back-N transmissions" value={String(gbn.total)} />
          <Readout label="Selective Repeat transmissions" value={String(sr.total)} />
        </>
      }
      controls={
        <>
          <Slider
            label="Window size"
            value={win}
            min={1}
            max={8}
            step={1}
            unit=""
            onChange={setWin}
          />
          <Slider
            label="Frame lost (once)"
            value={lost}
            min={0}
            max={frames - 1}
            step={1}
            unit=""
            onChange={setLost}
          />
        </>
      }
    >
      <div className="flex flex-col gap-3 p-3">
        <Cells
          items={gbn.sent}
          label="Go-Back-N sends"
          highlight={gbn.sent.map((f, i) => (f === lost ? i : -1)).filter((i) => i >= 0)}
        />
        <Cells
          items={sr.sent}
          label="Selective Repeat sends"
          highlight={sr.sent.map((f, i) => (f === lost ? i : -1)).filter((i) => i >= 0)}
        />
      </div>
    </WidgetShell>
  );
}

const EMP = [
  { dept: 10, name: "Asha" },
  { dept: 20, name: "Ravi" },
  { dept: 30, name: "Meena" },
];
const DEPT = [
  { dept: 10, title: "CSE" },
  { dept: 20, title: "ECE" },
  { dept: 40, title: "Civil" },
];

/** SQL joins on two small tables. */
export function SqlJoin({
  kind: k0,
  caption,
}: {
  kind: "inner" | "left" | "right" | "full";
  caption: string;
}) {
  const [kind, setKind] = useState(k0);
  const rows = join(EMP, DEPT, "dept", kind);
  const cols = ["dept", "name", "title"];
  return (
    <WidgetShell
      title={`${kind.toUpperCase()} JOIN on dept`}
      caption={caption}
      readouts={<Readout label="Rows in the result" value={String(rows.length)} />}
      controls={
        <Choice
          options={["inner", "left", "right", "full"] as const}
          value={kind}
          onChange={setKind}
          labels={{ inner: "INNER", left: "LEFT", right: "RIGHT", full: "FULL OUTER" }}
        />
      }
    >
      <div className="grid gap-2 p-3 sm:grid-cols-3">
        <TraceTable head={["dept", "name"]} rows={EMP.map((e) => [e.dept, e.name])} />
        <TraceTable head={["dept", "title"]} rows={DEPT.map((d) => [d.dept, d.title])} />
        <TraceTable head={cols} rows={rows.map((r) => cols.map((c) => r[c] ?? "NULL"))} />
      </div>
    </WidgetShell>
  );
}

function parseFds(text: string): FD[] {
  return text
    .split(/[,;\n]/)
    .map((p) =>
      p.split("->").map((s) => s.trim().replace(/\s/g, "").toUpperCase().split("").filter(Boolean)),
    )
    .filter((p) => p.length === 2 && p[0].length && p[1].length)
    .map(([lhs, rhs]) => ({ lhs, rhs }));
}

/** Attribute closure, candidate keys and the highest normal form. */
export function FdClosure({
  attributes,
  dependencies,
  caption,
}: {
  attributes: string;
  dependencies: string;
  caption: string;
}) {
  const [attrs, setAttrs] = useState(attributes);
  const [deps, setDeps] = useState(dependencies);
  const [x, setX] = useState("A");
  const all = [
    ...new Set(
      attrs
        .toUpperCase()
        .replace(/[^A-Z]/g, "")
        .split(""),
    ),
  ];
  const fds = parseFds(deps);
  const keys = all.length && all.length <= 8 ? candidateKeys(all, fds) : [];
  const xs = x
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .split("")
    .filter((a) => all.includes(a));
  return (
    <WidgetShell
      title="Functional dependencies"
      caption={caption}
      readouts={
        <>
          <Readout label={`{${xs.join("")}}⁺`} value={`{${closure(xs, fds).join("")}}`} />
          <Readout label="Candidate keys" value={keys.map((k) => k.join("")).join(", ") || "—"} />
          <Readout label="Highest normal form" value={all.length ? normalForm(all, fds) : "—"} />
        </>
      }
      controls={
        <>
          <TextField label="Attributes" value={attrs} onChange={setAttrs} />
          <TextField label="Dependencies (e.g. A->B, B->C)" value={deps} onChange={setDeps} />
          <TextField label="Find the closure of" value={x} onChange={setX} />
        </>
      }
    >
      <ul className="flex flex-wrap gap-2 p-3 font-mono text-sm">
        {fds.map((fd, i) => (
          <li key={i} className="rounded-md border border-border px-2 py-1">
            {fd.lhs.join("")} → {fd.rhs.join("")}
          </li>
        ))}
      </ul>
    </WidgetShell>
  );
}

function parseSchedule(text: string): Op[] {
  return [...text.matchAll(/([RW])(\d+)\(([a-z])\)/gi)].map((m) => ({
    op: m[1].toUpperCase() as "R" | "W",
    t: `T${m[2]}`,
    item: m[3].toLowerCase(),
  }));
}

/** Precedence graph and conflict serializability of a schedule. */
export function PrecedenceGraph({ schedule: s0, caption }: { schedule: string; caption: string }) {
  const [text, setText] = useState(s0);
  const ops = useMemo(() => parseSchedule(text), [text]);
  const g = precedenceGraph(ops);
  const nodes = [...new Set(ops.map((o) => o.t))].sort();
  const pos = (i: number) => ({ x: 70 + i * 110, y: 70 + (i % 2) * 40 });
  return (
    <WidgetShell
      title="Conflict serializability"
      caption={caption}
      readouts={
        <>
          <Readout
            label="Serializable?"
            value={g.serializable ? `yes: ${g.order.join(" → ")}` : "no (cycle)"}
          />
          <Readout
            label="Edges"
            value={g.edges.map(([a, b]) => `${a}→${b}`).join(", ") || "none"}
          />
        </>
      }
      controls={
        <TextField label="Schedule, e.g. R1(x) W2(x) W1(x)" value={text} onChange={setText} />
      }
    >
      <svg
        viewBox={`0 0 ${Math.max(260, nodes.length * 110 + 40)} 150`}
        className="block w-full"
        role="img"
        aria-label={g.serializable ? "No cycle" : "Cycle in the precedence graph"}
      >
        <defs>
          <marker
            id="pg-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="var(--muted)" />
          </marker>
        </defs>
        {g.edges.map(([a, b], i) => {
          const pa = pos(nodes.indexOf(a));
          const pb = pos(nodes.indexOf(b));
          const dx = pb.x - pa.x;
          const dy = pb.y - pa.y;
          const len = Math.hypot(dx, dy) || 1;
          const bend = nodes.indexOf(a) > nodes.indexOf(b) ? 30 : -30;
          return (
            <path
              key={i}
              d={`M${pa.x + (dx / len) * 20},${pa.y + (dy / len) * 20} Q${(pa.x + pb.x) / 2},${(pa.y + pb.y) / 2 + bend} ${pb.x - (dx / len) * 22},${pb.y - (dy / len) * 22}`}
              fill="none"
              stroke="var(--muted)"
              strokeWidth={2}
              markerEnd="url(#pg-arrow)"
            />
          );
        })}
        {nodes.map((n, i) => (
          <g key={n}>
            <circle cx={pos(i).x} cy={pos(i).y} r={20} fill="var(--primary)" />
            <text
              x={pos(i).x}
              y={pos(i).y + 5}
              textAnchor="middle"
              fill="white"
              fontWeight="bold"
              fontSize="13"
            >
              {n}
            </text>
          </g>
        ))}
      </svg>
    </WidgetShell>
  );
}
