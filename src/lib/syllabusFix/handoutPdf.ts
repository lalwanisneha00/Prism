import { ExtractError } from "@/lib/extract/types";
import { pagesToLines, type TextItem } from "@/lib/syllabusFix/handoutText";

/*
 * A course handout PDF → its lines, page by page, in reading order (browser, PDF.js, free). Unlike
 * the general reader in `src/lib/extract/pdf.ts` it keeps each piece's position, because handout
 * tables need sorting top to bottom to read like the Phase 2 import did. The file never leaves
 * the device.
 */
export async function readHandoutPdf(data: Uint8Array): Promise<string[][]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const task = pdfjs.getDocument({ data });
  let doc;
  try {
    doc = await task.promise;
  } catch (err) {
    if (err instanceof Error && err.name === "PasswordException")
      throw new ExtractError(
        "password",
        "This PDF is password-protected. Save a copy without the password and upload that.",
      );
    throw new ExtractError("corrupt", "This file couldn't be read as a PDF. It may be damaged.");
  }
  const pages: TextItem[][] = [];
  try {
    for (let n = 1; n <= Math.min(doc.numPages, 200); n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      // Text drawn outside the visible page is never shown by readers: drop it.
      const [x0, y0, x1, y1] = page.view;
      const items: TextItem[] = [];
      for (const it of content.items) {
        if (!("str" in it) || it.str === "") continue;
        const x = it.transform[4] as number;
        const y = it.transform[5] as number;
        if (x < x0 - 2 || x > x1 - 2 || y < y0 - 2 || y > y1 + 2) continue;
        items.push({ x, y, str: it.str });
      }
      pages.push(items);
      page.cleanup();
    }
  } finally {
    await task.destroy();
  }
  return pagesToLines(pages);
}
