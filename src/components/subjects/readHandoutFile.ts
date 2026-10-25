import { apiFetch } from "@/lib/byok/apiFetch";
import { extractFile } from "@/lib/extract/extractFile";
import { ExtractError, pagedText } from "@/lib/extract/types";
import { readHandoutPdf } from "@/lib/syllabusFix/handoutPdf";
import {
  readStudentHandout,
  textToPages,
  titleOverlap,
  type StudentHandout,
} from "@/lib/syllabusFix/studentHandout";
import { AiSyllabusSchema } from "@/lib/university/ai";

/*
 * Read a course handout file on the student's device (syllabus fix, Phases 3 and 4): rules first,
 * then one free AI call when the rules find nothing. Used by the course page upload and by
 * "My subject isn't here". Browser only (PDF.js).
 */

export type ReadResult =
  { ok: true; handout: StudentHandout; notes: string[] } | { ok: false; message: string };

/** Last try for a handout the rules cannot follow: the free AI reads the units (one call). */
async function readWithAi(text: string, subjectName: string): Promise<StudentHandout | null> {
  if (text.trim().length < 40) return null;
  const res = await apiFetch("/api/syllabus", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: text.slice(0, 60_000) }),
  });
  const body = (await res.json().catch(() => null)) as { syllabus?: unknown } | null;
  const parsed = AiSyllabusSchema.safeParse(body?.syllabus);
  if (!res.ok || !parsed.success) return null;
  const list = parsed.data.subjects;
  const subject =
    list.find((s) => titleOverlap(s.name, subjectName) >= 0.5) ??
    (list.length === 1 ? list[0] : null);
  if (!subject || subject.units.length === 0) return null;
  return {
    code: subject.code ?? null,
    title: subject.name,
    courseType: "theory",
    units: subject.units.slice(0, 20).map((u, i) => ({
      order: i + 1,
      name: u.name.slice(0, 300),
      topics: u.topics.slice(0, 80).map((t) => t.slice(0, 300)),
    })),
    experiments: [],
  };
}

/** The course's units (or experiments) from a handout file. `onAi` runs before the AI is asked. */
export async function readHandoutFile(
  file: File,
  course: { name: string; codes: string[] },
  onAi?: () => void,
): Promise<ReadResult> {
  try {
    const pdf = /\.pdf$/i.test(file.name) || file.type === "application/pdf";
    let pages: string[][];
    let text: string;
    if (pdf) {
      pages = await readHandoutPdf(new Uint8Array(await file.arrayBuffer()));
      text = pages.map((p) => p.join("\n")).join("\n\n");
    } else {
      text = pagedText(await extractFile(file));
      pages = textToPages(text);
    }
    const read = readStudentHandout(pages, course);
    if (read.ok) return { ok: true, handout: read.handout, notes: read.notes };
    if (read.reason === "not-found" && read.courses.length > 0)
      return {
        ok: false,
        message: `This file does not seem to have ${course.name}. It has: ${read.courses.slice(0, 8).join(", ")}${read.courses.length > 8 ? "…" : ""}.`,
      };
    onAi?.();
    const ai = await readWithAi(text, course.name);
    if (ai) return { ok: true, handout: ai, notes: ["Read with AI: please check every unit."] };
    return {
      ok: false,
      message:
        "I couldn't find units or experiments in that file. Try the handout PDF from your course page, or a clearer copy.",
    };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof ExtractError ? err.message : "That file couldn't be read. Try a PDF copy.",
    };
  }
}
