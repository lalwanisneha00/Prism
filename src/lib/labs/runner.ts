/*
 * "Run this code" for programming labs (syllabus fix, Phase 7C): Python (Pyodide), JavaScript and
 * SQL (sql.js) run in a Web Worker in the student's own browser. Free, nothing leaves the device,
 * and a stuck program is stopped by ending the worker. C, C++ and Java are not run (that would need
 * a paid code-execution service); their lessons show the expected output instead.
 */

export const RUNNABLE = ["python", "javascript", "sql"] as const;
export type Runnable = (typeof RUNNABLE)[number];
export const isRunnable = (l: string): l is Runnable => (RUNNABLE as readonly string[]).includes(l);

const PYODIDE = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";
const SQLJS = "https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/";

/** Time a program may run once its language is loaded. */
export const RUN_LIMIT_MS = 10_000;
/** Python's first run downloads Pyodide (about 10 MB). */
export const LOAD_LIMIT_MS = 90_000;

// The worker's own code, as text (a Blob URL keeps it out of the bundle and off our server).
const WORKER = `
let py = null, sql = null;
const fmt = (x) => typeof x === "object" && x !== null ? JSON.stringify(x) : String(x);
self.onmessage = async (e) => {
  const { language, code, input } = e.data;
  const out = [];
  const print = (s) => out.push(String(s));
  const lines = (input || "").split("\\n");
  let at = 0;
  try {
    if (language === "javascript") {
      const consoleLike = { log: (...a) => print(a.map(fmt).join(" ")), error: (...a) => print(a.map(fmt).join(" ")), warn: (...a) => print(a.map(fmt).join(" ")) };
      const prompt = () => (at < lines.length ? lines[at++] : null);
      new Function("console", "prompt", code)(consoleLike, prompt);
    } else if (language === "python") {
      if (!py) {
        self.postMessage({ type: "loading" });
        importScripts("${PYODIDE}pyodide.js");
        py = await loadPyodide({ indexURL: "${PYODIDE}" });
      }
      py.setStdout({ batched: print });
      py.setStderr({ batched: print });
      py.setStdin({ stdin: () => (at < lines.length ? lines[at++] : null) });
      self.postMessage({ type: "running" });
      await py.runPythonAsync(code);
    } else if (language === "sql") {
      if (!sql) {
        self.postMessage({ type: "loading" });
        importScripts("${SQLJS}sql-wasm.js");
        sql = await initSqlJs({ locateFile: (f) => "${SQLJS}" + f });
      }
      self.postMessage({ type: "running" });
      const db = new sql.Database();
      for (const r of db.exec(code)) {
        print(r.columns.join(" | "));
        for (const row of r.values) print(row.map((v) => (v === null ? "NULL" : String(v))).join(" | "));
        print("");
      }
      db.close();
    }
    self.postMessage({ type: "done", ok: true, output: out.join("\\n").trimEnd() });
  } catch (err) {
    self.postMessage({ type: "done", ok: false, output: out.join("\\n").trimEnd(), error: String(err && err.message ? err.message : err) });
  }
};
`;

export type RunResult = { ok: boolean; output: string; error?: string };

let worker: Worker | null = null;

function freshWorker(): Worker {
  const url = URL.createObjectURL(new Blob([WORKER], { type: "text/javascript" }));
  const w = new Worker(url);
  URL.revokeObjectURL(url);
  return w;
}

/** Runs one program; `onStage` reports "loading" (first Python/SQL run) and "running". */
export function runCode(
  language: Runnable,
  code: string,
  input: string,
  onStage?: (stage: "loading" | "running") => void,
): Promise<RunResult> {
  worker ??= freshWorker();
  const w = worker;
  return new Promise((resolve) => {
    let timer = setTimeout(stop, language === "javascript" ? RUN_LIMIT_MS : LOAD_LIMIT_MS);
    function stop() {
      w.terminate();
      if (worker === w) worker = null;
      resolve({
        ok: false,
        output: "",
        error:
          "Stopped: the program ran too long (an endless loop, or it is waiting for more input).",
      });
    }
    w.onmessage = (e: MessageEvent<{ type: string } & Partial<RunResult>>) => {
      const m = e.data;
      if (m.type === "loading") onStage?.("loading");
      else if (m.type === "running") {
        onStage?.("running");
        clearTimeout(timer);
        timer = setTimeout(stop, RUN_LIMIT_MS);
      } else if (m.type === "done") {
        clearTimeout(timer);
        resolve({ ok: Boolean(m.ok), output: m.output ?? "", error: m.error });
      }
    };
    w.onerror = (e) => {
      clearTimeout(timer);
      w.terminate();
      if (worker === w) worker = null;
      resolve({ ok: false, output: "", error: e.message || "The code runner could not start." });
    };
    w.postMessage({ language, code, input });
  });
}
