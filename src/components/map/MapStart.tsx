"use client";

import { MapSubjectPicker } from "@/components/map/MapSubjectPicker";
import { SubjectGraphLoader } from "@/components/map/SubjectGraphLoader";
import { useMySemester } from "@/components/subjects/useMySemester";
import { subjectIndex } from "@/lib/catalogue";

/**
 * The concept map when no subject is named in the address: it opens the student's own first subject
 * (their branch and semester, as saved), and only falls back to the first subject of the catalogue.
 */
export function MapStart() {
  const { picks, loaded } = useMySemester();
  if (!loaded) {
    return <div className="h-64 animate-pulse rounded-2xl bg-surface-2" aria-busy="true" />;
  }
  const mine = picks.find((id) => subjectIndex.some((s) => s.id === id));
  const id = mine ?? subjectIndex[0].id;
  return (
    <>
      <MapSubjectPicker currentId={id} />
      <SubjectGraphLoader subjectId={id} />
    </>
  );
}
