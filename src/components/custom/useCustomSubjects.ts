"use client";

import { useEffect, useState } from "react";
import { useDataVersion } from "@/components/account/AuthProvider";
import { toSubject } from "@/lib/custom/customSubject";
import { listCustomSubjects, toPayload } from "@/lib/custom/store";
import { listLocalNotes } from "@/lib/notes/store";
import type { CustomSubjectRecord } from "@/lib/storage/db";
import type { Subject } from "@/lib/subjects";

/** The student's own subjects (records and as ordinary subjects), kept up to date with sync. */
export function useCustomSubjects(): {
  records: CustomSubjectRecord[];
  subjects: Subject[];
  loaded: boolean;
  reload: () => void;
} {
  const dataVersion = useDataVersion();
  const [state, setState] = useState<{ records: CustomSubjectRecord[]; subjects: Subject[] }>({
    records: [],
    subjects: [],
  });
  const [loaded, setLoaded] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    Promise.all([listCustomSubjects(), listLocalNotes().catch(() => [])])
      .then(([records, notes]) => {
        const withMaterial = new Set(notes.filter((n) => n.chunks.length).map((n) => n.subject));
        setState({
          records,
          subjects: records
            .filter((r) => r.chapters.length > 0)
            .map((r) => toSubject(toPayload(r, withMaterial.has(r.id)))),
        });
      })
      .catch(() => setState({ records: [], subjects: [] }))
      .finally(() => setLoaded(true));
  }, [dataVersion, version]);

  return { ...state, loaded, reload: () => setVersion((v) => v + 1) };
}
