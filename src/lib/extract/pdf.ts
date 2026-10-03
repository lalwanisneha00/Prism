import {
  ExtractError,
  finishDoc,
  type ExtractedDoc,
  type ExtractedSection,
} from "@/lib/extract/types";

/*
 * Reads a PDF in the browser with PDF.js (Mozilla's PDF reader). The file is never uploaded:
 * think of it as photocopying the pages on your own desk. Pages with almost no text (scans,
 * picture slides saved as PDF) are kept and marked, never silently dropped.
 */

export async function extractPdf(
  name: string,
  data: Uint8Array,
  onProgress?: (done: number, total: number) => void,
): Promise<ExtractedDoc> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const task = pdfjs.getDocument({ data });
  let doc;
  try {
    doc = await task.promise;
  } catch (err) {
    if (err instanceof Error && err.name === "PasswordException") {
      throw new ExtractError(
        "password",
        "This PDF is password-protected. Open it, save a copy without the password (or print it to a new PDF), and upload that.",
      );
    }
    throw new ExtractError("corrupt", "This file couldn't be read as a PDF. It may be damaged.");
  }

  const sections: ExtractedSection[] = [];
  try {
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      let text = "";
      for (const item of content.items) {
        if ("str" in item) text += item.str + (item.hasEOL ? "\n" : " ");
      }
      sections.push({
        kind: "page",
        index: n,
        label: `page ${n}`,
        blocks: [{ kind: "paragraph", text }],
        images: 0,
        thin: false,
      });
      page.cleanup();
      onProgress?.(n, doc.numPages);
    }
  } finally {
    await task.destroy();
  }
  return finishDoc(name, "pdf", sections);
}
