"use client";

import { useMemo, useState } from "react";
import { useCustomSubjects } from "@/components/custom/useCustomSubjects";
import { useMyBranch } from "@/components/subjects/useMyBranch";
import { useMySemester } from "@/components/subjects/useMySemester";
import { toPayload } from "@/lib/custom/store";
import type { CustomSubjectPayload } from "@/lib/custom/customSubject";
import { mockSubjectIds } from "@/lib/mock/scope";
import { findSubject, type Subject } from "@/lib/subjects";
import { canonicalSubject } from "@/lib/syllabusFix/alias";
import { hiddenByFlags, loadMyFlags, type HiddenByFlags } from "@/lib/syllabusFix/myFlags";

export type MockSubject = { subject: Subject; custom?: CustomSubjectPayload };

/**
 * The subjects the Mock Tests page offers: the student's own branch and semester list (with the
 * live syllabus fixes), their own subjects, minus labs and anything they flagged out. A subject
 * opened from a link (a subject page's "Mock test" button) is added at the top.
 */
export function useMockSubjects(linked?: string): {
  list: MockSubject[];
  loaded: boolean;
  hasProfile: boolean;
  hidden: HiddenByFlags;
} {
  const { mine, loaded: branchLoaded } = useMyBranch();
  const { semester, picks, loaded: semLoaded } = useMySemester();
  const custom = useCustomSubjects();
  // The student's own flags, read once when the page opens.
  const [flags] = useState(() => (typeof window === "undefined" ? [] : loadMyFlags()));
  const hidden = useMemo(() => hiddenByFlags(flags, semester), [flags, semester]);

  const list = useMemo(() => {
    const own = new Map(custom.records.map((r) => [r.id, r]));
    const resolve = (id: string): MockSubject | null => {
      const record = own.get(id);
      if (record) {
        if (record.chapters.length === 0) return null;
        const payload = toPayload(record, false);
        const subject = custom.subjects.find((s) => s.id === id);
        return subject ? { subject, custom: payload } : null;
      }
      const subject = findSubject(canonicalSubject(id));
      return subject ? { subject } : null;
    };
    const ids = mockSubjectIds(
      [...picks, ...custom.records.map((r) => r.id)],
      hidden,
      (id) => findSubject(id)?.courseType === "practical",
    );
    const first = linked && !ids.includes(linked) ? [linked] : [];
    const seen = new Set<string>();
    return [...first, ...ids].flatMap((id) => {
      const s = resolve(id);
      if (!s || seen.has(s.subject.id)) return [];
      seen.add(s.subject.id);
      return [s];
    });
  }, [picks, custom.records, custom.subjects, hidden, linked]);

  return {
    list,
    loaded: branchLoaded && semLoaded && custom.loaded,
    hasProfile: Boolean(mine.branch && mine.semester),
    hidden,
  };
}
