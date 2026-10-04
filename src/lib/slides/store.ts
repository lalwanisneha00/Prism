import { getDb, type StoredSlideFile } from "@/lib/storage/db";

/* "My slides and PDFs": generated files kept in this browser so they can be downloaded again. */

export type SlideFileInfo = Omit<StoredSlideFile, "blob">;

export async function saveSlideFile(
  file: Omit<StoredSlideFile, "id" | "createdAt" | "bytes">,
  now = Date.now(),
): Promise<StoredSlideFile> {
  const record: StoredSlideFile = {
    ...file,
    id: `${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: now,
    bytes: file.blob.size,
  };
  const db = await getDb();
  await db.put("slideFiles", record);
  return record;
}

/** Newest first, without the file contents (cheap to list). */
export async function listSlideFiles(): Promise<SlideFileInfo[]> {
  const db = await getDb();
  const all = await db.getAll("slideFiles");
  return all
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((f) => ({
      id: f.id,
      title: f.title,
      subject: f.subject,
      purpose: f.purpose,
      format: f.format,
      theme: f.theme,
      slides: f.slides,
      bytes: f.bytes,
      createdAt: f.createdAt,
    }));
}

export async function getSlideFile(id: string): Promise<StoredSlideFile | undefined> {
  return (await getDb()).get("slideFiles", id);
}

export async function deleteSlideFile(id: string): Promise<void> {
  await (await getDb()).delete("slideFiles", id);
}

export function fileName(file: Pick<StoredSlideFile, "title" | "format" | "purpose">): string {
  const base = file.title
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return `${base || "prism"}-${file.purpose}.${file.format}`;
}

export const MIME: Record<"pptx" | "pdf", string> = {
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  pdf: "application/pdf",
};
