"use client";

import { useCallback, useEffect, useState } from "react";
import { useDataVersion } from "@/components/account/AuthProvider";
import { pickId, type ElectiveChoices } from "@/lib/pdeu/electives";
import { getSettings, updateSettings } from "@/lib/storage/progress";

/** The student's elective picks (saved in their synced settings). */
export function useElectiveChoices(): {
  choices: ElectiveChoices;
  loaded: boolean;
  /** `pick` is 1-based (a slot where the student takes several options has picks 1, 2, 3…). */
  choose: (branch: string, slotKey: string, optionKey: string | "", pick?: number) => void;
} {
  const dataVersion = useDataVersion();
  const [choices, setChoices] = useState<ElectiveChoices>({});
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    getSettings()
      .then((s) => setChoices(s?.electiveChoices ?? {}))
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, [dataVersion]);
  const choose = useCallback(
    (branch: string, slotKey: string, optionKey: string, pick = 1) => {
      const next = { ...choices };
      const key = pickId(branch, slotKey, pick);
      if (optionKey) next[key] = optionKey;
      else delete next[key];
      setChoices(next);
      void updateSettings({ electiveChoices: next }).catch(() => undefined);
    },
    [choices],
  );
  return { choices, loaded, choose };
}
