import { unzipSync } from "fflate";
import type { ExtractedSection } from "@/lib/extract/types";
import { cleanOcrText } from "@/lib/ocr/cleanText";
import type { NoteFile, StoredNote } from "@/lib/storage/db";

/*
 * "Read text from images" (V2.5 · Step 2), all in the browser. Tesseract.js is a free OCR
 * engine that runs on this device: the picture never leaves it. It downloads its English
 * language data once (a few MB, from a free CDN), then works offline from the cache.
 */

export type OcrProgress = (done: number, total: number) => void;

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
  webp: "image/webp",
};

/** The pictures that make up one section: the photo itself, a PDF page, or a slide's photos. */
export async function sectionImages(
  note: StoredNote,
  file: NoteFile,
  section: ExtractedSection,
): Promise<Blob[]> {
  if (note.format === "image") return [new Blob([file.bytes], { type: file.mime })];
  if (note.format === "pdf") return [await renderPdfPage(file.bytes, section.index)];
  const wanted = new Set(section.pictures ?? []);
  if (wanted.size === 0) return [];
  const files = unzipSync(new Uint8Array(file.bytes), { filter: (f) => wanted.has(f.name) });
  return [...wanted]
    .filter((p) => files[p])
    .map((p) => {
      const ext = p.slice(p.lastIndexOf(".") + 1).toLowerCase();
      return new Blob([files[p].slice()], { type: MIME[ext] ?? "image/png" });
    });
}

/** Draws one PDF page as a picture, twice the normal size so small print stays readable. */
async function renderPdfPage(bytes: ArrayBuffer, pageNumber: number): Promise<Blob> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const task = pdfjs.getDocument({ data: new Uint8Array(bytes.slice(0)) });
  try {
    const doc = await task.promise;
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvas, viewport }).promise;
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("render failed"))), "image/png"),
    );
  } finally {
    await task.destroy();
  }
}

/** Reads the text in pictures on this device. Progress runs from 0 to the number of pictures. */
export async function ocrOnDevice(images: Blob[], onProgress?: OcrProgress): Promise<string> {
  if (images.length === 0) return "";
  const { createWorker } = await import("tesseract.js");
  let current = 0;
  const worker = await createWorker("eng", 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") onProgress?.(current + m.progress, images.length);
    },
  });
  try {
    const texts: string[] = [];
    for (const [i, image] of images.entries()) {
      current = i;
      const result = await worker.recognize(image);
      texts.push(cleanOcrText(result.data.text));
      onProgress?.(i + 1, images.length);
    }
    return texts.filter(Boolean).join("\n\n");
  } finally {
    await worker.terminate();
  }
}

/** Shrinks a picture to at most 1600 px wide and returns it as JPEG base64 for the AI. */
export async function toJpegBase64(image: Blob): Promise<string> {
  const bitmap = await createImageBitmap(image);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL("image/jpeg", 0.85);
  return url.slice(url.indexOf(",") + 1);
}

export type AiReadResult =
  { ok: true; text: string } | { ok: false; kind: string; message: string };

/** Reads one picture with the AI (uses the free AI quota; the student asks for it each time). */
export async function readWithAi(image: Blob, signal?: AbortSignal): Promise<AiReadResult> {
  const res = await fetch("/api/read-image", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ image: await toJpegBase64(image), mimeType: "image/jpeg" }),
    signal,
  }).catch(() => null);
  if (!res) return { ok: false, kind: "network", message: "No connection. Try again." };
  const body: unknown = await res.json().catch(() => null);
  if (body && typeof body === "object" && "ok" in body) {
    const b = body as { ok: boolean; text?: unknown; kind?: unknown; message?: unknown };
    if (b.ok && typeof b.text === "string") return { ok: true, text: cleanOcrText(b.text) };
    return {
      ok: false,
      kind: typeof b.kind === "string" ? b.kind : "unavailable",
      message: typeof b.message === "string" ? b.message : "The AI couldn't read this picture.",
    };
  }
  return { ok: false, kind: "unavailable", message: "The AI couldn't read this picture." };
}
