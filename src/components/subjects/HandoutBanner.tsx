"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useDataVersion } from "@/components/account/AuthProvider";
import { HELP_VERIFY_EVENT } from "@/components/subjects/TrustBadge";
import { getSettings } from "@/lib/storage/progress";
import { handoutWanted } from "@/lib/syllabusFix/studentHandout";
import type { Confidence } from "@/lib/syllabusFix/tree";

// The handout reader (PDF.js, parser) loads only when the student opens the upload.
const HandoutUpload = dynamic(() => import("@/components/subjects/HandoutUpload"), {
  ssr: false,
  loading: () => <div className="h-24 animate-pulse rounded-xl bg-surface-2" aria-busy="true" />,
});

/**
 * "Got this semester's handout?" (syllabus fix, Phase 3): shown on a course page while the course
 * is not verified for the student's batch. Small and dismissible for this visit.
 */
export function HandoutBanner({
  subjectId,
  subjectName,
  codes,
  confidence,
  batchYears,
}: {
  subjectId: string;
  subjectName: string;
  codes: string[];
  confidence: Confidence;
  batchYears?: number[];
}) {
  const dataVersion = useDataVersion();
  const [batchYear, setBatchYear] = useState<number | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const box = useRef<HTMLElement>(null);

  // "Help verify?" on the trust badge (Phase 7): open the upload, even after "Not now".
  useEffect(() => {
    const on = () => {
      setHidden(false);
      setOpen(true);
      requestAnimationFrame(() => box.current?.scrollIntoView({ block: "center" }));
    };
    window.addEventListener(HELP_VERIFY_EVENT, on);
    return () => window.removeEventListener(HELP_VERIFY_EVENT, on);
  }, []);

  useEffect(() => {
    getSettings()
      .then((s) => setBatchYear(s?.batchYear))
      .catch(() => setBatchYear(undefined));
  }, [dataVersion]);

  if (hidden || !handoutWanted(confidence, batchYears, batchYear)) return null;
  return (
    <section
      ref={box}
      aria-label="Upload your course handout"
      data-testid="handout-banner"
      className="flex max-w-2xl flex-col gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm"
    >
      {!open ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="min-w-0 flex-1">
            Got this semester&apos;s handout for this course? Upload it and help fix Prism for
            everyone.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-full bg-primary px-4 py-1.5 font-semibold text-primary-fg hover:bg-primary-hover"
            >
              Upload handout
            </button>
            <button
              type="button"
              onClick={() => setHidden(true)}
              className="rounded-full border border-border px-3 py-1.5 font-semibold hover:bg-surface-2"
            >
              Not now
            </button>
          </div>
        </div>
      ) : (
        <HandoutUpload
          subjectId={subjectId}
          subjectName={subjectName}
          codes={codes}
          onClose={() => setOpen(false)}
        />
      )}
    </section>
  );
}
