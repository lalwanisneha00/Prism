"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDataVersion } from "@/components/account/AuthProvider";
import { CustomSubjectForm } from "@/components/custom/CustomSubjectForm";
import { TierBadge } from "@/components/lesson/TierBadge";
import { SubjectProgress } from "@/components/subjects/SubjectProgress";
import { getCustomSubject, loadCustomSubject } from "@/lib/custom/store";
import type { CustomSubjectRecord } from "@/lib/storage/db";
import type { Subject } from "@/lib/subjects";

function NotFound() {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6"
    >
      <h1 className="text-2xl font-bold">That subject isn&apos;t here</h1>
      <p className="text-muted">
        It may have been deleted, or it hasn&apos;t synced to this device yet.
      </p>
      <Link
        href="/my-subjects"
        className="w-fit rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-fg"
      >
        My subjects
      </Link>
    </div>
  );
}

const skeleton = <div className="h-64 animate-pulse rounded-2xl bg-surface-2" aria-busy="true" />;

export function EditCustomSubject({ id }: { id: string }) {
  const [record, setRecord] = useState<CustomSubjectRecord | null | "loading">("loading");
  useEffect(() => {
    getCustomSubject(id)
      .then((r) => setRecord(r ?? null))
      .catch(() => setRecord(null));
  }, [id]);
  if (record === "loading") return skeleton;
  if (!record) return <NotFound />;
  return <CustomSubjectForm existing={record} />;
}

/** A student's own subject: details, shortcuts, chapters with progress and exam emphasis. */
export function ViewCustomSubject({ id }: { id: string }) {
  const dataVersion = useDataVersion();
  const [data, setData] = useState<
    { subject: Subject; record: CustomSubjectRecord } | null | "loading"
  >("loading");
  useEffect(() => {
    loadCustomSubject(id)
      .then((r) => setData(r ? { subject: r.subject, record: r.record } : null))
      .catch(() => setData(null));
  }, [id, dataVersion]);
  if (data === "loading") return skeleton;
  if (!data) return <NotFound />;
  const { subject, record } = data;
  const d = record.details;
  const days = d.examDate
    ? Math.ceil(
        (Date.parse(`${d.examDate}T00:00:00`) - new Date().setHours(0, 0, 0, 0)) / 86_400_000,
      )
    : null;
  const nextExam = record.chapters.filter((c) => d.nextExam?.includes(c.id)).map((c) => c.name);

  return (
    <div className="flex flex-col gap-6" data-testid="custom-subject-view">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          <Link href="/my-subjects" className="underline">
            My subjects
          </Link>{" "}
          › {record.teaching === "skill" ? "Skill subject" : "Theory subject"}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">{subject.name}</h1>
        <TierBadge tier={subject.tier} />
        {record.chapters.length === 0 && (
          <div
            className="flex flex-col gap-2 rounded-xl border border-primary/40 bg-primary-soft px-4 py-3 text-sm"
            data-testid="needs-setup"
          >
            <p className="font-semibold">
              Upload the material given by your faculty to study this subject here. This is optional
              and you can do it any time.
            </p>
            <p className="text-muted">
              Your subject is saved. Add its units and topics, or upload your slides, notes or
              previous-year papers, whenever you are ready to study it.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/my-subjects/edit?id=${subject.id}`}
                className="rounded-full bg-primary px-4 py-2 font-semibold text-primary-fg hover:bg-primary-hover"
              >
                Add syllabus or topics
              </Link>
              <Link
                href={`/notes?subject=${subject.id}`}
                className="rounded-full border border-border px-4 py-2 font-semibold hover:bg-surface-2"
              >
                Upload material
              </Link>
            </div>
          </div>
        )}
        {subject.tier === "limited" && record.chapters.length > 0 && (
          <p className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-2 text-sm">
            Lessons use free trusted sources only, so they may not match your course closely.{" "}
            <Link href={`/notes?subject=${subject.id}`} className="font-semibold underline">
              Upload your slides or notes
            </Link>{" "}
            for lessons that follow your faculty.
          </p>
        )}
        <ul className="flex flex-wrap gap-2 text-sm text-muted">
          {d.examDate && (
            <li className="rounded-full border border-border px-3 py-1">
              Exam {d.examDate}
              {days !== null && days >= 0 ? ` · in ${days} ${days === 1 ? "day" : "days"}` : ""}
            </li>
          )}
          {d.examKind && (
            <li className="rounded-full border border-border px-3 py-1">
              {d.examKind === "end-sem" ? "End-semester" : "Internal"}
            </li>
          )}
          {d.marksPattern && (
            <li className="rounded-full border border-border px-3 py-1">{d.marksPattern}</li>
          )}
          {d.language && (
            <li className="rounded-full border border-border px-3 py-1">Taught in {d.language}</li>
          )}
          {record.outlineFrom === "material" && (
            <li className="rounded-full border border-border px-3 py-1">
              Outline built from your material
            </li>
          )}
        </ul>
        {nextExam.length > 0 && (
          <p className="text-sm">
            <strong>In the next exam:</strong> {nextExam.join(", ")}
          </p>
        )}
        <nav aria-label="Shortcuts" className="flex flex-wrap gap-2">
          {record.chapters.length > 0 && (
            <Link
              href={`/?subject=${subject.id}#start`}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg hover:bg-primary-hover"
            >
              Start a lesson
            </Link>
          )}
          <Link
            href={`/notes?subject=${subject.id}`}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-2"
          >
            My materials
          </Link>
          {record.chapters.length > 0 && (
            <Link
              href={`/map?subject=${subject.id}`}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-2"
            >
              Concept map
            </Link>
          )}
          {record.chapters.length > 0 && (
            <Link
              href={`/mock-test?subject=${subject.id}`}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-2"
            >
              Mock test
            </Link>
          )}
          <Link
            href={`/my-subjects/edit?id=${subject.id}`}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-2"
          >
            Edit subject
          </Link>
        </nav>
      </div>
      {record.chapters.length > 0 && <SubjectProgress subjectId={subject.id} subject={subject} />}
    </div>
  );
}
