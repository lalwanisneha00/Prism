import type { CodeLanguage } from "@/lib/code/codeBlocks";

/*
 * Runs a lesson's code sample in the student's browser (V3 · Step 5). Each run happens in a
 * throwaway Web Worker: it can't touch the page, the network is not needed, and it is stopped
 * after a few seconds, so a broken or endless sample can't hang the lesson. Python runs with
 * Pyodide (Python compiled to WebAssembly, free, loaded from a CDN the first time).
 */

export type RunResult =
  | { status: "ran"; output: string }
  | { status: "error"; output: string; error: string }
  | { status: "timeout"; output: string }
  | { status: "not-executed"; reason: string };

const PYODIDE = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/";

const JS_WORKER = `
const out = [];
const show = (v) => typeof v === "string" ? v : (() => { try { return JSON.stringify(v); } catch { return String(v); } })();
console.log = (...a) => out.push(a.map(show).join(" "));
console.error = console.log;
self.onmessage = (e) => {
  try { new Function(e.data)(); postMessage({ ok: true, output: out.join("\\n") }); }
  catch (err) { postMessage({ ok: false, output: out.join("\\n"), error: String(err && err.message || err) }); }
};`;

const PY_WORKER = `
importScripts("${PYODIDE}pyodide.js");
let ready = loadPyodide({ indexURL: "${PYODIDE}" });
self.onmessage = async (e) => {
  const py = await ready;
  const out = [];
  py.setStdout({ batched: (s) => out.push(s) });
  py.setStderr({ batched: (s) => out.push(s) });
  try { await py.runPythonAsync(e.data); postMessage({ ok: true, output: out.join("\\n") }); }
  catch (err) { postMessage({ ok: false, output: out.join("\\n"), error: String(err && err.message || err).split("\\n").slice(-2).join(" ") }); }
};`;

function runInWorker(source: string, code: string, timeoutMs: number): Promise<RunResult> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
    const worker = new Worker(url);
    const done = (r: RunResult) => {
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve(r);
    };
    const timer = setTimeout(() => done({ status: "timeout", output: "" }), timeoutMs);
    worker.onmessage = (e: MessageEvent<{ ok: boolean; output: string; error?: string }>) =>
      done(
        e.data.ok
          ? { status: "ran", output: e.data.output }
          : { status: "error", output: e.data.output, error: e.data.error ?? "error" },
      );
    worker.onerror = (e) => done({ status: "error", output: "", error: e.message });
    worker.postMessage(code);
  });
}

export async function runCode(language: CodeLanguage, code: string): Promise<RunResult> {
  if (typeof Worker === "undefined") {
    return { status: "not-executed", reason: "This browser can't run code samples." };
  }
  if (language === "javascript") return runInWorker(JS_WORKER, code, 4000);
  // Python's first run downloads Pyodide (a few MB), so it gets longer.
  if (language === "python") return runInWorker(PY_WORKER, code, 60_000);
  return {
    status: "not-executed",
    reason:
      language === "c"
        ? "C samples aren't run in the browser yet: check them in a compiler before relying on the output."
        : "This language isn't run in the browser.",
  };
}
