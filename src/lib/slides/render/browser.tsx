"use client";

import { createElement } from "react";
import type { ImageMap, RenderedImage } from "@/lib/slides/pptx";
import type { SlidePlan, VisualRequest } from "@/lib/slides/plan";

/*
 * Browser-only: draws a plan's pictures (formulas, diagrams, the lesson's own visuals at their
 * fixed states) into PNG images. Everything is drawn off-screen in a fixed light palette
 * (.export-light), by the same trusted renderers the lesson page uses.
 */

const WIDTH = 880;
const PIXEL_RATIO = 2;
const SETTLE_MS = 350;
const MAX_WAIT_MS = 12_000;

/** Waits until the host stops changing and nothing in it is still loading. */
async function settle(host: HTMLElement, signal?: AbortSignal): Promise<void> {
  const start = Date.now();
  let last = "";
  let steadySince = Date.now();
  while (Date.now() - start < MAX_WAIT_MS) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    await new Promise((r) => setTimeout(r, 80));
    const busy = host.querySelector('[aria-busy="true"], .animate-pulse') !== null;
    const images = [...host.querySelectorAll("img")].some((i) => !i.complete);
    const snapshot = `${host.innerHTML.length}:${host.scrollHeight}`;
    if (snapshot !== last || busy || images) {
      last = snapshot;
      steadySince = Date.now();
    } else if (Date.now() - steadySince >= SETTLE_MS) return;
  }
}

function newHost(): HTMLDivElement {
  const host = document.createElement("div");
  host.className = "export-light";
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${WIDTH}px;padding:12px;pointer-events:none;`;
  document.body.appendChild(host);
  return host;
}

async function snapshotHost(host: HTMLElement): Promise<RenderedImage> {
  const { toPng } = await import("html-to-image");
  const rect = host.getBoundingClientRect();
  const dataUrl = await toPng(host, {
    pixelRatio: PIXEL_RATIO,
    backgroundColor: "#ffffff",
    cacheBust: true,
  });
  return {
    dataUrl,
    width: Math.round(rect.width * PIXEL_RATIO),
    height: Math.round(rect.height * PIXEL_RATIO),
  };
}

async function drawLatex(latex: string, signal?: AbortSignal): Promise<RenderedImage> {
  const katex = (await import("katex")).default;
  const host = newHost();
  try {
    host.style.width = "auto";
    host.style.maxWidth = `${WIDTH}px`;
    host.style.fontSize = "30px";
    host.style.display = "inline-block";
    host.innerHTML = katex.renderToString(latex, {
      displayMode: true,
      throwOnError: false,
      output: "html",
    });
    await document.fonts?.ready;
    await settle(host, signal);
    return await snapshotHost(host);
  } finally {
    host.remove();
  }
}

async function drawMermaid(code: string): Promise<RenderedImage> {
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "neutral",
    fontFamily: "Arial, sans-serif",
  });
  await mermaid.parse(code);
  const { svg } = await mermaid.render(`export-${Math.random().toString(36).slice(2)}`, code);
  const host = newHost();
  try {
    host.innerHTML = svg;
    await settle(host);
    return await snapshotHost(host);
  } finally {
    host.remove();
  }
}

async function drawVisual(
  spec: Extract<VisualRequest, { kind: "visual" }>["spec"],
  signal?: AbortSignal,
): Promise<RenderedImage> {
  if (spec.type === "mermaid") return drawMermaid(spec.code);
  const [{ createRoot }, { VisualSlot }] = await Promise.all([
    import("react-dom/client"),
    import("@/components/lesson/VisualSlot"),
  ]);
  const host = newHost();
  const root = createRoot(host);
  try {
    root.render(createElement(VisualSlot, { visual: spec }));
    await settle(host, signal);
    return await snapshotHost(host);
  } finally {
    root.unmount();
    host.remove();
  }
}

export type RenderProgress = { done: number; total: number; label: string };

/** Draws every picture in the plan, one at a time (gentle on memory); a failure skips that picture. */
export async function renderImages(
  plan: SlidePlan,
  onProgress: (p: RenderProgress) => void,
  signal?: AbortSignal,
): Promise<{ images: ImageMap; failed: string[] }> {
  const entries = Object.entries(plan.visuals);
  const images: ImageMap = {};
  const failed: string[] = [];
  let done = 0;
  for (const [key, request] of entries) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    onProgress({
      done,
      total: entries.length,
      label: request.kind === "latex" ? "Typesetting formulas" : "Drawing pictures",
    });
    try {
      images[key] =
        request.kind === "latex"
          ? await drawLatex(request.latex, signal)
          : request.kind === "mermaid"
            ? await drawMermaid(request.code)
            : await drawVisual(request.spec, signal);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      failed.push(key);
    }
    done++;
  }
  onProgress({ done, total: entries.length, label: "Pictures ready" });
  return { images, failed };
}
