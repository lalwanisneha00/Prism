import { detectFormat } from "@/lib/extract/detect";
import { decodeText } from "@/lib/extract/plainText";
import { finishDoc, type ExtractedDoc } from "@/lib/extract/types";

/*
 * The one entry point for reading an uploaded file on the student's device. Each format's
 * reader is loaded only when that kind of file is used, so the page stays light.
 */

export type ProgressFn = (done: number, total: number) => void;

export async function extractFile(file: File, onProgress?: ProgressFn): Promise<ExtractedDoc> {
  const data = new Uint8Array(await file.arrayBuffer());
  return extractBytes(file.name, data, onProgress);
}

export async function extractBytes(
  name: string,
  data: Uint8Array,
  onProgress?: ProgressFn,
): Promise<ExtractedDoc> {
  const format = detectFormat(name, data.byteLength, data.subarray(0, 4096));
  switch (format) {
    case "pdf":
      return (await import("@/lib/extract/pdf")).extractPdf(name, data, onProgress);
    case "pptx":
      return (await import("@/lib/extract/pptx")).extractPptx(name, data);
    case "docx":
      return (await import("@/lib/extract/docx")).extractDocx(name, data);
    case "xlsx":
      return (await import("@/lib/extract/xlsx")).extractXlsx(name, data);
    case "odt":
      return (await import("@/lib/extract/odf")).extractOdt(name, data);
    case "odp":
      return (await import("@/lib/extract/odf")).extractOdp(name, data);
    case "csv":
      return (await import("@/lib/extract/plainText")).extractCsv(name, decodeText(data));
    case "md":
      return (await import("@/lib/extract/plainText")).extractMd(name, decodeText(data));
    case "rtf": {
      const { extractTxt, rtfToText } = await import("@/lib/extract/plainText");
      return extractTxt(name, rtfToText(decodeText(data)), "rtf");
    }
    case "txt":
      return (await import("@/lib/extract/plainText")).extractTxt(name, decodeText(data));
    case "image":
      // The words in a photo are read by "Read text from images" (OCR), which the student starts.
      return finishDoc(name, "image", [
        { kind: "image", index: 1, label: "image", blocks: [], images: 1, thin: true },
      ]);
  }
}
