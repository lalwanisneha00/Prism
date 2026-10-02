/*
 * Reads the text of a PDF in the browser with PDF.js (Mozilla's PDF reader). The file is
 * never uploaded: think of it as photocopying the pages on your own desk.
 */

export class PdfTextError extends Error {
  constructor(
    readonly kind: "unreadable" | "no-text" | "password",
    message: string,
  ) {
    super(message);
  }
}

export async function extractPdfPages(
  data: ArrayBuffer,
  onProgress?: (page: number, total: number) => void,
): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const task = pdfjs.getDocument({ data: new Uint8Array(data) });
  let doc;
  try {
    doc = await task.promise;
  } catch (err) {
    if (err instanceof Error && err.name === "PasswordException") {
      throw new PdfTextError("password", "This PDF is password-protected.");
    }
    throw new PdfTextError("unreadable", "This file couldn't be read as a PDF.");
  }

  const pages: string[] = [];
  try {
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      let text = "";
      for (const item of content.items) {
        if ("str" in item) text += item.str + (item.hasEOL ? "\n" : " ");
      }
      pages.push(text.replace(/[ \t]+/g, " ").trim());
      page.cleanup();
      onProgress?.(n, doc.numPages);
    }
  } finally {
    await task.destroy();
  }

  const words = pages.join(" ").split(/\s+/).filter(Boolean).length;
  if (words < 20) {
    throw new PdfTextError(
      "no-text",
      "We couldn't find any text in this PDF. It may be a scan or photos of pages.",
    );
  }
  return pages;
}
