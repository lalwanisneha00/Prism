"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDataVersion } from "@/components/account/AuthProvider";
import {
  picksFor,
  SEMESTER_CHANGED_EVENT,
  withPick,
  type SemesterPicks,
} from "@/lib/semester/mySemester";
import { visibleSubjects, type ElectiveChoices } from "@/lib/pdeu/electives";
import { getSettings, updateSettings } from "@/lib/storage/progress";
import { useSyllabusOverlay } from "@/components/subjects/useSyllabusOverlay";
import { subjects, subjectsFor } from "@/lib/subjects";
import { canonicalSubject } from "@/lib/syllabusFix/alias";
import { liveSemesterIds } from "@/lib/syllabusFix/overlay";

/**
 * "My subjects this semester": the semester the student is in, and which subjects their college
 * teaches in each semester (chosen by them). Saved in their settings, which sync to their account.
 */
export function useMySemester(): {
  semester: number | undefined;
  /**
   * The student's subjects for the current semester, in the order every subject list shows them:
   * the ones they added themselves, then their PDEU subjects (electives as chosen), then any they ticked by hand.
   */
  picks: string[];
  all: SemesterPicks;
  loaded: boolean;
  setSemester: (n: number | undefined) => void;
  toggle: (subjectId: string, on: boolean) => void;
} {
  const dataVersion = useDataVersion();
  const [semester, setSem] = useState<number | undefined>();
  const [all, setAll] = useState<SemesterPicks>({});
  const [loaded, setLoaded] = useState(false);
  const [branch, setBranch] = useState<string | undefined>();
  const [choices, setChoices] = useState<ElectiveChoices>({});
  // Bumped when something else (the syllabus upload) changed the semester or its subjects.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const on = () => setTick((t) => t + 1);
    window.addEventListener(SEMESTER_CHANGED_EVENT, on);
    return () => window.removeEventListener(SEMESTER_CHANGED_EVENT, on);
  }, []);
  // A choice made on this page wins over a load that was still on its way.
  const chosenAt = useRef(0);
  // Courses students moved into or out of this semester (syllabus fix, Phase 5).
  const overlay = useSyllabusOverlay();

  useEffect(() => {
    const started = Date.now();
    getSettings()
      .then((s) => {
        if (chosenAt.current > started) return;
        setSem(s?.semester);
        setAll(s?.mySubjects ?? {});
        setBranch(s?.branch);
        setChoices(s?.electiveChoices ?? {});
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, [dataVersion, tick]);

  const setSemester = useCallback((n: number | undefined) => {
    chosenAt.current = Date.now();
    setSem(n);
    void updateSettings({ semester: n }).catch(() => undefined);
  }, []);

  const toggle = useCallback(
    (subjectId: string, on: boolean) => {
      if (!semester) return;
      chosenAt.current = Date.now();
      const next = withPick(all, semester, subjectId, on);
      setAll(next);
      void updateSettings({ mySubjects: next }).catch(() => undefined);
    },
    [all, semester],
  );

  const picks = useMemo(() => {
    // A pick of a merged course's retired copy means its main copy (syllabus fix aliases).
    const manual = picksFor(all, semester).map((id) => canonicalSubject(id));
    const pdeu =
      branch && semester
        ? liveSemesterIds(
            visibleSubjects(subjectsFor(branch, semester), branch, choices).map((s) => s.id),
            overlay,
            branch,
            semester,
            // Listed courses only: labs stay hidden until Phase 7B.
            (id) => subjects.find((s) => s.id === id),
          )
        : [];
    const own = manual.filter((id) => id.startsWith("custom-"));
    return [...new Set([...own, ...pdeu, ...manual])];
  }, [all, semester, branch, choices, overlay]);

  return { semester, picks, all, loaded, setSemester, toggle };
}
