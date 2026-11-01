"use client";

import { useCallback, useEffect, useState } from "react";
import { useDataVersion } from "@/components/account/AuthProvider";
import { loadPapers } from "@/components/mock/engine";
import type { PaperInfo } from "@/lib/mock/plan";

/** The student's uploaded past papers (this device and others), reloaded after sync or upload. */
export function usePapers(): { papers: PaperInfo[]; loaded: boolean; reload: () => void } {
  const dataVersion = useDataVersion();
  const [papers, setPapers] = useState<PaperInfo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let alive = true;
    loadPapers()
      .then((p) => alive && setPapers(p))
      .catch(() => alive && setPapers([]))
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, [dataVersion, version]);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { papers, loaded, reload };
}
