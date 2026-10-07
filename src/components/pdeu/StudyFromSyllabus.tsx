"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { chaptersFromDraft, guessTeaching } from "@/lib/custom/customSubject";
import type { DraftChapter } from "@/lib/custom/syllabusText";
import { createCustomSubject, listCustomSubjects } from "@/lib/custom/store";
import { addSubjectToSemester } from "@/lib/semester/mySemester";

/**
 * Makes the PDEU course a subject of the student's own (units as chapters, topics as topics) the
 * first time, then opens it. Every Prism feature (lessons, quizzes, flashcards, planner) works on
 * it, and the student can add the material their faculty gave. Doing it twice opens the same one.
 */
export function StudyFromSyllabus({
  name,
  semester,
  chapters,
  goTo,
  label,
  primary,
}: {
  name: string;
  semester: number;
  chapters: DraftChapter[];
  goTo: "view" | "edit";
  label: string;
  primary?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "working" | "error">("idle");

  async function go() {
    setState("working");
    try {
      const mine = await listCustomSubjects();
      let record = mine.find(
        (r) => r.name === name && r.outlineFrom === "syllabus" && r.details.semester === semester,
      );
      if (!record) {
        record = await createCustomSubject({
          name: name.slice(0, 120),
          teaching: guessTeaching(name),
          chapters: chaptersFromDraft(chapters),
          details: { semester },
          outlineFrom: "syllabus",
        });
        await addSubjectToSemester(semester, record.id);
      }
      router.push(`/my-subjects/${goTo}?id=${encodeURIComponent(record.id)}`);
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={go}
        disabled={state === "working"}
        className={
          primary
            ? "w-fit rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-60"
            : "w-fit rounded-full border border-primary px-5 py-2.5 font-semibold text-primary hover:bg-primary-soft disabled:opacity-60"
        }
      >
        {state === "working" ? "Opening…" : label}
      </button>
      {state === "error" && (
        <p role="alert" className="text-sm text-danger">
          Could not save this subject on your device. Try again.
        </p>
      )}
    </div>
  );
}
