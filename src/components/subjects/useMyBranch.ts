"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDataVersion } from "@/components/account/AuthProvider";
import { SEMESTER_CHANGED_EVENT } from "@/lib/semester/mySemester";
import { getSettings, updateSettings } from "@/lib/storage/progress";
import { findBranch } from "@/lib/subjects";

export type MyBranch = { branch?: string; semester?: number };

/**
 * "My branch and semester" (V3 · Step 3): saved in the student's settings, which sync to
 * their account, so every device shows their subjects first.
 */
export function useMyBranch(): {
  mine: MyBranch;
  loaded: boolean;
  save: (next: MyBranch) => void;
} {
  const dataVersion = useDataVersion();
  const [mine, setMine] = useState<MyBranch>({});
  const [loaded, setLoaded] = useState(false);
  // A choice made on this page wins over a load that was still on its way.
  const chosenAt = useRef(0);

  useEffect(() => {
    const started = Date.now();
    getSettings()
      .then((s) => {
        if (chosenAt.current > started) return;
        setMine({
          ...(s?.branch && findBranch(s.branch) ? { branch: s.branch } : {}),
          ...(s?.semester ? { semester: s.semester } : {}),
        });
      })
      .catch(() => setMine({}))
      .finally(() => setLoaded(true));
  }, [dataVersion]);

  const save = useCallback((next: MyBranch) => {
    chosenAt.current = Date.now();
    setMine(next);
    void updateSettings({ branch: next.branch, semester: next.semester })
      // Other lists of "my subjects" (concept map, uploads…) reload to the new branch.
      .then(() => window.dispatchEvent(new Event(SEMESTER_CHANGED_EVENT)))
      .catch(() => undefined);
  }, []);

  return { mine, loaded, save };
}
