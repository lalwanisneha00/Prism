"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDataVersion } from "@/components/account/AuthProvider";
import { getSettings } from "@/lib/storage/progress";
import { setUniversityOff } from "@/lib/university/apply";
import { applyScope, hiddenCount, type SubjectScopes } from "@/lib/university/match";
import type { Subject } from "@/lib/subjects";

/**
 * The student's university syllabus applied to built-in subjects: only the chapters and topics their
 * university teaches. "Show everything again" switches it off without losing it.
 */
export function useUniversityScope(): {
  scopes: SubjectScopes;
  name: string;
  /** True when a syllabus is applied and in use. */
  active: boolean;
  loaded: boolean;
  setOff: (off: boolean) => void;
  reload: () => void;
} {
  const dataVersion = useDataVersion();
  const [state, setState] = useState<{ scopes: SubjectScopes; name: string; off: boolean }>({
    scopes: {},
    name: "",
    off: false,
  });
  const [loaded, setLoaded] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    getSettings()
      .then((s) =>
        setState({
          scopes: s?.universityScope ?? {},
          name: s?.universityName ?? "",
          off: Boolean(s?.universityOff),
        }),
      )
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, [dataVersion, version]);

  const setOff = useCallback((off: boolean) => {
    setState((s) => ({ ...s, off }));
    void setUniversityOff(off).catch(() => undefined);
  }, []);

  return {
    scopes: state.scopes,
    name: state.name,
    active: !state.off && Object.keys(state.scopes).length > 0,
    loaded,
    setOff,
    reload: () => setVersion((v) => v + 1),
  };
}

/** Subjects as the student's university teaches them (unchanged when no syllabus is applied). */
export function useScopedSubjects(list: readonly Subject[]): {
  subjects: Subject[];
  hidden: number;
  active: boolean;
  name: string;
  setOff: (off: boolean) => void;
} {
  const { scopes, active, name, setOff } = useUniversityScope();
  return useMemo(() => {
    if (!active) return { subjects: [...list], hidden: 0, active, name, setOff };
    let hidden = 0;
    const subjects = list.map((s) => {
      const scope = scopes[s.id];
      hidden += hiddenCount(s, scope);
      return applyScope(s, scope);
    });
    return { subjects, hidden, active, name, setOff };
  }, [list, scopes, active, name, setOff]);
}
