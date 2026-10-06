"use client";

import { useEffect, useState } from "react";
import { useDataVersion } from "@/components/account/AuthProvider";
import { SEMESTER_CHANGED_EVENT } from "@/lib/semester/mySemester";
import { getSettings } from "@/lib/storage/progress";
import type { SyllabusByTerm } from "@/lib/syllabus/types";

/** The student's uploaded semester syllabi (personal; synced with their settings). */
export function useSyllabus(): { syllabus: SyllabusByTerm; loaded: boolean } {
  const dataVersion = useDataVersion();
  const [syllabus, setSyllabus] = useState<SyllabusByTerm>({});
  const [loaded, setLoaded] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const on = () => setTick((t) => t + 1);
    window.addEventListener(SEMESTER_CHANGED_EVENT, on);
    return () => window.removeEventListener(SEMESTER_CHANGED_EVENT, on);
  }, []);
  useEffect(() => {
    getSettings()
      .then((s) => setSyllabus(s?.syllabus ?? {}))
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, [dataVersion, tick]);
  return { syllabus, loaded };
}
