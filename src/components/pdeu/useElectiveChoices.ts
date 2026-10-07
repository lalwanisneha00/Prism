"use client";

import { useCallback, useEffect, useState } from "react";
import { useDataVersion } from "@/components/account/AuthProvider";
import { choiceId, type ElectiveChoices } from "@/lib/pdeu/electives";
import { getSettings, updateSettings } from "@/lib/storage/progress";

/** The student's elective picks (saved in their synced settings). */
export function useElectiveChoices(): {
  choices: ElectiveChoices;
  loaded: boolean;
  choose: (branch: string, slotKey: string, optionKey: string | "") => void;
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
    (branch: string, slotKey: string, optionKey: string) => {
      const next = { ...choices };
      if (optionKey) next[choiceId(branch, slotKey)] = optionKey;
      else delete next[choiceId(branch, slotKey)];
      setChoices(next);
      void updateSettings({ electiveChoices: next }).catch(() => undefined);
    },
    [choices],
  );
  return { choices, loaded, choose };
}
