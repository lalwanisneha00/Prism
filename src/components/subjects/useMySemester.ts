"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDataVersion } from "@/components/account/AuthProvider";
import {
  picksFor,
  SEMESTER_CHANGED_EVENT,
  withPick,
  type SemesterPicks,
} from "@/lib/semester/mySemester";
import { getSettings, updateSettings } from "@/lib/storage/progress";

/**
 * "My subjects this semester": the semester the student is in, and which subjects their college
 * teaches in each semester (chosen by them). Saved in their settings, which sync to their account.
 */
export function useMySemester(): {
  semester: number | undefined;
  /** Subject ids chosen for the current semester. */
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
  // Bumped when something else (the syllabus upload) changed the semester or its subjects.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const on = () => setTick((t) => t + 1);
    window.addEventListener(SEMESTER_CHANGED_EVENT, on);
    return () => window.removeEventListener(SEMESTER_CHANGED_EVENT, on);
  }, []);
  // A choice made on this page wins over a load that was still on its way.
  const chosenAt = useRef(0);

  useEffect(() => {
    const started = Date.now();
    getSettings()
      .then((s) => {
        if (chosenAt.current > started) return;
        setSem(s?.semester);
        setAll(s?.mySubjects ?? {});
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

  return { semester, picks: picksFor(all, semester), all, loaded, setSemester, toggle };
}
