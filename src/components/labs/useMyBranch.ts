"use client";

import { useEffect, useState } from "react";
import { useDataVersion } from "@/components/account/AuthProvider";
import { getSettings } from "@/lib/storage/progress";

/** The branch in the student's profile (undefined until loaded, or when none is set). */
export function useMyBranch(): string | undefined {
  const dataVersion = useDataVersion();
  const [branch, setBranch] = useState<string | undefined>();
  useEffect(() => {
    let live = true;
    getSettings()
      .then((s) => live && setBranch(s?.branch))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [dataVersion]);
  return branch;
}
