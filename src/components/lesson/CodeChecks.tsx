"use client";

import { useEffect, useState } from "react";
import { codeVerdict, type CodeCheckState, type CodeSample } from "@/lib/code/codeBlocks";
import { runCode } from "@/lib/code/runCode";

/*
 * "Does this code really print that?" (V3 · Step 5, SPEC §12.3 rule 8). Each code sample in a
 * section is run in the student's browser and its real output compared with the output the
 * lesson claims. Like a teacher running the program on the board instead of trusting the
 * textbook. JavaScript runs straight away (it is instant); Python needs a few MB of Pyodide
 * the first time, so it runs when asked; C is labelled "not executed".
 */

const languageName = { javascript: "JavaScript", python: "Python", c: "C", other: "Code" };

const toneClass: Record<ReturnType<typeof codeVerdict>["tone"], string> = {
  muted: "text-muted",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

function SampleCheck({ sample, index }: { sample: CodeSample; index: number }) {
  const [state, setState] = useState<CodeCheckState>({ status: "idle" });
  const run = () => {
    setState({ status: "running" });
    void runCode(sample.language, sample.code).then(setState);
  };

  // JavaScript and unsupported languages are checked at once; Python waits for a tap.
  useEffect(() => {
    if (sample.language === "python") return;
    let live = true;
    void runCode(sample.language, sample.code).then((r) => {
      if (live) setState(r);
    });
    return () => {
      live = false;
    };
  }, [sample.language, sample.code]);

  const v = codeVerdict(sample, state);
  const output = "output" in state ? state.output : null;
  return (
    <li className="flex flex-col gap-1.5" data-testid="code-check" data-status={state.status}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">
          Sample {index + 1} ({languageName[sample.language]})
        </span>
        {(sample.language === "python" || sample.language === "javascript") && (
          <button
            type="button"
            onClick={run}
            disabled={state.status === "running"}
            className="rounded-full border border-border px-3 py-0.5 text-xs font-semibold hover:bg-surface disabled:opacity-60"
          >
            {state.status === "idle" ? "Run and check" : "Run again"}
          </button>
        )}
      </div>
      <p className={toneClass[v.tone]} role="status">
        {v.text}
      </p>
      {output !== null && output !== "" && (
        <div>
          <p className="text-xs text-muted">Real output:</p>
          <pre className="overflow-x-auto rounded-lg bg-surface p-2 font-mono text-xs">
            {output}
          </pre>
        </div>
      )}
    </li>
  );
}

export function CodeChecks({ samples }: { samples: CodeSample[] }) {
  if (samples.length === 0) return null;
  return (
    <section
      aria-label="Code checks"
      className="rounded-xl border border-border bg-surface-2/60 p-3 text-sm"
      data-anno-skip=""
    >
      <p className="mb-2 text-xs font-semibold text-muted uppercase">Code checked by running it</p>
      <ol className="flex flex-col gap-3">
        {samples.map((s, i) => (
          <SampleCheck key={`${i}-${s.code.length}`} sample={s} index={i} />
        ))}
      </ol>
    </section>
  );
}
