"use client";

import { useMemo } from "react";
import { useCustomSubjects } from "@/components/custom/useCustomSubjects";
import { useMySemester } from "@/components/subjects/useMySemester";

/**
 * The student's own subjects as the subject lists should show them: only the ones that are among
 * their subjects for some semester ("My subjects"). One they took out of their subjects no longer
 * turns up in Start a lesson, the concept map or the uploads (it can still be managed, or deleted,
 * under "Other subjects"). `alsoShow` keeps one that a link asks for.
 */
export function useVisibleCustomSubjects(alsoShow?: string) {
  const custom = useCustomSubjects();
  const mine = useMySemester();
  return useMemo(() => {
    const picked = new Set(Object.values(mine.all).flat());
    // Without a saved semester there are no "my subjects" yet, so all their own subjects show.
    const keep = (id: string) => !mine.semester || picked.has(id) || id === alsoShow;
    return {
      ...custom,
      subjects: custom.subjects.filter((s) => keep(s.id)),
      records: custom.records.filter((r) => keep(r.id)),
      loaded: custom.loaded && mine.loaded,
    };
  }, [custom, mine.all, mine.loaded, mine.semester, alsoShow]);
}
