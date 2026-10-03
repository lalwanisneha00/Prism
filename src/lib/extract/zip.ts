import { unzipSync, type Unzipped } from "fflate";
import { ExtractError } from "@/lib/extract/types";
import { parseXml, attr, childElements, type XmlElement } from "@/lib/extract/xml";

/*
 * Office (.pptx, .docx, .xlsx) and OpenDocument (.odt, .odp) files are ZIP folders of XML.
 * We unzip only the XML we need (never the pictures), with a size cap, so a booby-trapped
 * "zip bomb" can't fill the browser's memory.
 */

const MAX_UNZIPPED_BYTES = 120 * 1024 * 1024;

export type ZipFolder = { files: Unzipped; read: (path: string) => string | undefined };

export function openZip(data: Uint8Array, wanted: (name: string) => boolean): ZipFolder {
  let total = 0;
  let files: Unzipped;
  try {
    files = unzipSync(data, {
      filter: (f) => {
        if (!wanted(f.name)) return false;
        total += f.originalSize;
        if (total > MAX_UNZIPPED_BYTES) {
          throw new ExtractError("too-big", "This file has too much text to read in the browser.");
        }
        return true;
      },
    });
  } catch (err) {
    if (err instanceof ExtractError) throw err;
    throw new ExtractError(
      "corrupt",
      "This file seems to be damaged or isn't really the type its name says.",
    );
  }
  const decoder = new TextDecoder("utf-8");
  return {
    files,
    read: (p) => {
      const bytes = files[p];
      return bytes ? decoder.decode(bytes) : undefined;
    },
  };
}

export function readXml(zip: ZipFolder, p: string): XmlElement | undefined {
  const text = zip.read(p);
  return text === undefined ? undefined : parseXml(text);
}

/** Resolves a relationship target ("../notesSlides/notesSlide3.xml") against a folder. */
export function resolvePath(baseDir: string, target: string): string {
  if (target.startsWith("/")) return target.slice(1);
  const parts = baseDir ? baseDir.split("/") : [];
  for (const piece of target.split("/")) {
    if (piece === "..") parts.pop();
    else if (piece !== "." && piece !== "") parts.push(piece);
  }
  return parts.join("/");
}

export type Relationship = { id: string; type: string; target: string };

/**
 * Reads the "_rels" file that sits next to an Office part, e.g. ppt/slides/_rels/slide1.xml.rels.
 * Targets come back as full paths inside the ZIP.
 */
export function readRels(zip: ZipFolder, partPath: string): Relationship[] {
  const slash = partPath.lastIndexOf("/");
  const dir = slash === -1 ? "" : partPath.slice(0, slash);
  const file = partPath.slice(slash + 1);
  const xml = readXml(zip, `${dir ? `${dir}/` : ""}_rels/${file}.rels`);
  if (!xml) return [];
  const root = childElements(xml, "Relationships")[0];
  if (!root) return [];
  return childElements(root, "Relationship").map((r: XmlElement) => {
    const external = attr(r, "TargetMode") === "External";
    const target = attr(r, "Target") ?? "";
    return {
      id: attr(r, "Id") ?? "",
      type: attr(r, "Type") ?? "",
      target: external ? target : resolvePath(dir, target),
    };
  });
}

/** "slide12.xml" → 12, so parts can be sorted the way a person would. */
export function partNumber(p: string): number {
  const m = /(\d+)\.xml$/.exec(p);
  return m ? Number(m[1]) : 0;
}
