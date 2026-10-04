"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { downloadBlob } from "@/components/slides/SlidesPanel";
import { PURPOSE_INFO, type Purpose } from "@/lib/slides/plan";
import {
  deleteSlideFile,
  getSlideFile,
  listSlideFiles,
  type SlideFileInfo,
} from "@/lib/slides/store";

const size = (bytes: number) =>
  bytes > 1_000_000
    ? `${(bytes / 1_000_000).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1000))} KB`;

/** "My slides and PDFs": every file made on this device, to download again. */
export function MySlides() {
  const [files, setFiles] = useState<SlideFileInfo[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    listSlideFiles()
      .then(setFiles)
      .catch(() => setFailed(true));
  }, []);
  useEffect(load, [load]);

  if (failed)
    return (
      <p role="alert" className="rounded-2xl border border-border bg-surface p-5">
        This browser is blocking storage, so files can&apos;t be kept here.
      </p>
    );
  if (!files)
    return <div className="h-32 animate-pulse rounded-2xl bg-surface-2" aria-busy="true" />;
  if (files.length === 0)
    return (
      <p className="rounded-2xl border border-dashed border-border p-6 text-muted">
        Nothing here yet. Open the{" "}
        <Link href="/#start" className="font-semibold text-primary underline">
          lesson maker
        </Link>{" "}
        and choose &ldquo;Make slides or a PDF instead&rdquo;.
      </p>
    );
  return (
    <ul className="flex flex-col gap-3">
      {files.map((f) => (
        <li
          key={f.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4"
        >
          <div className="min-w-0">
            <p className="font-semibold">{f.title}</p>
            <p className="text-sm text-muted">
              {PURPOSE_INFO[f.purpose as Purpose]?.label ?? f.purpose} ·{" "}
              {f.format === "pptx" ? "PowerPoint" : "PDF"} · {f.slides} slides · {size(f.bytes)} ·{" "}
              {new Date(f.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                const file = await getSlideFile(f.id);
                if (file) downloadBlob(file);
              }}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-2"
            >
              Download
            </button>
            <button
              type="button"
              onClick={() => void deleteSlideFile(f.id).then(load)}
              className="rounded-full border border-danger/40 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/10"
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
