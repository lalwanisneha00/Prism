import { Icon, type IconName } from "@/components/Icon";

/*
 * Small sample screens for the Themes page. They use the same classes and tokens as the real
 * pages (cards, chips, buttons, .markdown, code, figures, the mock-test timer), so a theme looks
 * here exactly as it will in the app. Decorative: the theme name next to them carries the meaning.
 */

const NAV: IconName[] = ["idea", "study", "exam", "library", "map"];

/** A tiny bar chart drawn with the theme's own colours. */
function MiniChart({ values, height = 56 }: { values: number[]; height?: number }) {
  const max = Math.max(...values);
  const w = 100 / values.length;
  return (
    <svg viewBox={`0 0 100 ${height}`} className="h-auto w-full" aria-hidden="true">
      <line x1="0" y1={height - 0.5} x2="100" y2={height - 0.5} stroke="var(--border)" />
      {values.map((v, i) => {
        const h = (v / max) * (height - 6);
        return (
          <rect
            key={i}
            x={i * w + w * 0.2}
            y={height - h - 1}
            width={w * 0.6}
            height={h}
            rx="1"
            fill={i === values.length - 1 ? "var(--primary)" : "var(--muted)"}
            opacity={i === values.length - 1 ? 1 : 0.45}
          />
        );
      })}
    </svg>
  );
}

function MiniNav() {
  return (
    <div className="site-header flex items-center gap-2 border-b border-border bg-bg px-3 py-2">
      <span className="size-4 rounded-sm bg-fg" />
      <span className="font-display text-sm font-bold">Prism</span>
      <ul className="site-nav ml-auto flex items-center gap-0.5">
        {NAV.slice(0, 4).map((n, i) => (
          <li key={n}>
            <a
              aria-current={i === 0 ? "page" : undefined}
              className={`flex rounded-full px-1.5 py-1 text-xs ${
                i === 0 ? "bg-primary-soft text-primary" : "text-fg"
              }`}
            >
              <Icon name={n} />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The card preview: a nav bar, a lesson card, a chart, a button and some text. */
export function MiniPreview() {
  return (
    <div className="pointer-events-none flex h-full flex-col text-left select-none">
      <MiniNav />
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="rounded-2xl border border-border bg-surface p-2.5">
          <p className="flex items-center gap-1 text-[0.65rem] text-muted">
            <span className="size-1.5 rounded-full bg-[var(--level-deep-dive)]" />
            Deep Dive · 10 min
          </p>
          <h3 className="mt-0.5 text-sm leading-tight font-semibold">Faraday&rsquo;s law</h3>
          <p className="mt-1 text-[0.7rem] leading-snug text-muted">
            A changing magnetic flux makes a voltage in the coil.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1 rounded-xl border border-border bg-surface p-1.5">
            <MiniChart values={[3, 5, 4, 6, 8]} height={30} />
          </div>
          <span className="rounded-xl bg-primary px-2.5 py-1.5 text-[0.7rem] font-semibold text-primary-fg">
            Start
          </span>
        </div>
      </div>
    </div>
  );
}

export function SampleDashboard() {
  const stats: [string, string, IconName][] = [
    ["Day streak", "6", "flame"],
    ["Minutes this week", "184", "study"],
    ["Cards due", "12", "cards"],
  ];
  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div>
        <p className="text-sm text-muted">Good evening</p>
        <h2 className="text-2xl font-bold">Your study dashboard</h2>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {stats.map(([label, value, icon]) => (
          <div key={label} className="rounded-2xl border border-border bg-surface p-3">
            <p className="flex items-center gap-1 text-xs text-muted">
              <Icon name={icon} /> <span className="truncate">{label}</span>
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <h3 className="font-semibold">Continue</h3>
          <p className="mt-1 text-sm text-muted">Applied Physics · Electromagnetic induction</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full w-3/5 rounded-full bg-primary" />
          </div>
          <p className="mt-1 text-xs text-muted tabular-nums">3 of 5 topics</p>
          <span className="mt-3 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-fg">
            Resume lesson
          </span>
        </div>
        <figure className="rounded-2xl border border-border bg-surface p-4">
          <h3 className="font-semibold">This week</h3>
          <div className="mt-2">
            <MiniChart values={[20, 35, 15, 42, 30, 18, 24]} />
          </div>
          <figcaption className="mt-1 text-xs text-muted">Minutes studied, Mon to Sun</figcaption>
        </figure>
      </div>
    </div>
  );
}

export function SampleLesson() {
  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <p className="text-sm text-muted">Applied Physics › Electricity and Magnetism</p>
      <h2 className="text-2xl font-bold sm:text-3xl">Faraday&rsquo;s law of induction</h2>
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1">
          <span className="size-2 rounded-full bg-[var(--level-first-encounter)]" /> First Encounter
        </span>
        <span className="rounded-full border border-border bg-surface px-3 py-1">10 min</span>
      </div>
      <div className="markdown">
        <p>
          When the <strong>magnetic flux</strong> through a coil changes, a voltage appears across
          it. The faster the change, the bigger the voltage: <mark>ε = −dΦ/dt</mark>.
        </p>
        <blockquote>
          <p>Think of flux as how much field “leaks” through the loop.</p>
        </blockquote>
      </div>
      <figure className="rounded-2xl border border-border bg-surface p-3">
        <svg viewBox="0 0 240 70" className="h-auto w-full" aria-hidden="true">
          {[
            [8, "Magnet moves"],
            [88, "Flux changes"],
            [168, "Voltage (EMF)"],
          ].map(([x, label], i) => (
            <g key={String(label)}>
              <rect
                x={Number(x)}
                y="18"
                width="64"
                height="34"
                rx="4"
                fill="var(--surface-2)"
                stroke={i === 2 ? "var(--primary)" : "var(--border)"}
              />
              <text
                x={Number(x) + 32}
                y="39"
                textAnchor="middle"
                fontSize="8"
                fill="var(--fg)"
                fontFamily="var(--ui-font)"
              >
                {label}
              </text>
              {i < 2 && (
                <path
                  d={`M${Number(x) + 66} 35 h12 m-4 -3 l4 3 l-4 3`}
                  stroke="var(--muted)"
                  fill="none"
                />
              )}
            </g>
          ))}
        </svg>
        <figcaption className="mt-1 text-xs text-muted">Concept map: what causes what</figcaption>
      </figure>
      <pre className="overflow-x-auto rounded-xl border border-border bg-surface-2 p-3 font-mono text-sm leading-relaxed">
        <code>{"emf = -N * (phi2 - phi1) / dt  # volts"}</code>
      </pre>
    </div>
  );
}

export function SampleMockTest() {
  const options = ["Lenz's law", "Ohm's law", "Coulomb's law", "Gauss's law"];
  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">Mock test · Unit 3</h2>
        <span className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 font-mono text-sm font-semibold tabular-nums">
          <Icon name="exam" /> 24:18
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5" aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className={`grid size-7 place-items-center rounded-lg border text-xs font-semibold tabular-nums ${
              i === 3
                ? "border-primary bg-primary text-primary-fg"
                : i < 3
                  ? "border-border bg-primary-soft text-primary"
                  : "border-border bg-surface text-muted"
            }`}
          >
            {i + 1}
          </span>
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="text-xs text-muted">Question 4 · 2 marks</p>
        <h3 className="mt-1 font-semibold">
          Which law gives the direction of the induced current?
        </h3>
        <ul className="mt-3 flex flex-col gap-2">
          {options.map((o, i) => (
            <li
              key={o}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                i === 0 ? "border-primary bg-primary-soft text-primary" : "border-border"
              }`}
            >
              <span
                className={`size-3.5 rounded-full border-2 ${
                  i === 0 ? "border-primary bg-primary" : "border-muted"
                }`}
              />
              {o}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex justify-between gap-2">
        <span className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">
          Previous
        </span>
        <span className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-fg">
          Save and next
        </span>
      </div>
    </div>
  );
}
