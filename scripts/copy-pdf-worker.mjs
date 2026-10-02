// Copies PDF.js's worker into public/ so the browser can load it from our own site
// (the notes upload reads PDFs on the student's device; nothing is uploaded).
import { copyFileSync, existsSync, mkdirSync } from "node:fs";

const from = "node_modules/pdfjs-dist/build/pdf.worker.min.mjs";
if (existsSync(from)) {
  mkdirSync("public", { recursive: true });
  copyFileSync(from, "public/pdf.worker.min.mjs");
}
