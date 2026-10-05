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

/** woff2 files already fetched and turned into base64, by URL. */
const fontData = new Map<string, Promise<string>>();

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

/**
 * The KaTeX fonts a formula actually uses, as a small piece of CSS with the font files inlined
 * (woff2 only). Letting the picture library gather every format of every font makes a file so
 * large the browser refuses to load it; a formula without its font is drawn in the wrong glyphs.
 */
async function katexFontCss(host: HTMLElement): Promise<string> {
  const used = new Set<string>();
  for (const el of host.querySelectorAll("*")) {
    const style = getComputedStyle(el);
    const family = style.fontFamily.split(",")[0].replace(/['"\s]/g, "");
    if (family.startsWith("KaTeX")) used.add(`${family}|${style.fontWeight}|${style.fontStyle}`);
  }
  const css: string[] = [];
  for (const sheet of [...document.styleSheets]) {
    let rules: CSSRule[];
    try {
      rules = [...sheet.cssRules];
    } catch {
      continue; // a sheet from another site cannot be read
    }
    for (const rule of rules) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const family = rule.style.getPropertyValue("font-family").replace(/['"\s]/g, "");
      const weight = rule.style.getPropertyValue("font-weight") || "400";
      const style = rule.style.getPropertyValue("font-style") || "normal";
      const bold = weight === "700" || weight === "bold" ? "700" : "400";
      const wanted = [...used].some(
        (u) => u === `${family}|${bold}|${style}` || u === `${family}|${weight}|${style}`,
      );
      if (!family.startsWith("KaTeX") || !wanted) continue;
      const url = /url\(\s*["']?([^"')]+\.woff2)["']?\s*\)/.exec(
        rule.style.getPropertyValue("src"),
      );
      if (!url) continue;
      const href = new URL(url[1], sheet.href ?? location.href).href;
      if (!fontData.has(href)) {
        fontData.set(
          href,
          fetch(href)
            .then((r) => r.arrayBuffer())
            .then((buf) => toBase64(new Uint8Array(buf))),
        );
      }
      css.push(
        `@font-face{font-family:${family};font-style:${style};font-weight:${weight};src:url(data:font/woff2;base64,${await fontData.get(href)}) format("woff2");}`,
      );
    }
  }
  return css.join("");
}

async function snapshotHost(host: HTMLElement, fontEmbedCSS?: string): Promise<RenderedImage> {
  const { toPng } = await import("html-to-image");
  const rect = host.getBoundingClientRect();
  const dataUrl = await toPng(host, {
    pixelRatio: PIXEL_RATIO,
    backgroundColor: "#ffffff",
    cacheBust: true,
    ...(fontEmbedCSS !== undefined ? { fontEmbedCSS } : {}),
    // The host sits off-screen; the copy being drawn must not.
    style: { position: "static", left: "0", top: "0" },
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
    host.style.width = "max-content";
    host.style.maxWidth = `${WIDTH}px`;
    host.style.fontSize = "26px";
    host.style.display = "inline-block";
    host.innerHTML = katex.renderToString(latex, {
      displayMode: true,
      throwOnError: false,
      output: "html",
    });
    // No page-style margins around the formula: the picture is cropped to it.
    for (const el of host.querySelectorAll<HTMLElement>(".katex-display")) el.style.margin = "0";
    await document.fonts?.ready;
    await settle(host, signal);
    const css = await katexFontCss(host);
    try {
      return await snapshotHost(host, css);
    } catch (err) {
      const r = host.getBoundingClientRect();
      const src = err instanceof Event ? ((err.target as HTMLImageElement | null)?.src ?? "") : "";
      console.warn(
        "[slides] latex snapshot",
        r.width,
        r.height,
        css.length,
        src.length,
        src.slice(0, 120),
        host.innerHTML.length,
      );
      throw err;
    }
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
    host.style.width = "max-content";
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
      console.warn("[slides] a picture could not be drawn:", key, err);
      failed.push(key);
    }
    done++;
  }
  onProgress({ done, total: entries.length, label: "Pictures ready" });
  return { images, failed };
}
