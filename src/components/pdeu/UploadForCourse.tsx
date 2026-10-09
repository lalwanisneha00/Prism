"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { NON_CORE_UPLOAD_MESSAGE } from "@/lib/pdeu/messages";
import { guessTeaching } from "@/lib/custom/customSubject";
import { createCustomSubject, listCustomSubjects } from "@/lib/custom/store";
import { addSubjectToSemester } from "@/lib/semester/mySemester";

/**
 * The upload box for a non-core course the handbook prints no syllabus for (no Prism subject yet).
 * It makes a subject of the student's own with the course's name the first time (and finds it again
 * after), then opens Uploads with that subject chosen, like the other cards.
 */
export function UploadForCourse({ name, semester }: { name: string; semester: number }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "working" | "error">("idle");

  async function go() {
    setState("working");
    try {
      const mine = await listCustomSubjects();
      let record = mine.find((r) => r.name === name && r.details.semester === semester);
      if (!record) {
        record = await createCustomSubject({
          name: name.slice(0, 120),
          teaching: guessTeaching(name),
          chapters: [],
          details: { semester },
          outlineFrom: "typed",
        });
        await addSubjectToSemester(semester, record.id);
      }
      router.push(`/notes?subject=${encodeURIComponent(record.id)}`);
    } catch {
      setState("error");
    }
  }

  return (
    <div
      className="flex flex-col gap-1 rounded-xl bg-primary-soft px-3 py-2 text-xs"
      data-testid="upload-material-note"
    >
      <p>{NON_CORE_UPLOAD_MESSAGE}</p>
      <button
        type="button"
        onClick={go}
        disabled={state === "working"}
        className="w-fit text-left font-semibold text-primary underline disabled:opacity-60"
      >
        {state === "working" ? "Opening…" : "Upload material"}
      </button>
      {state === "error" && (
        <p role="alert" className="text-danger">
          Could not set this subject up on your device. Try again.
        </p>
      )}
    </div>
  );
}
