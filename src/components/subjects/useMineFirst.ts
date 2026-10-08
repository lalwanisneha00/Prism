"use client";

import { useMemo } from "react";
import { useMySemester } from "@/components/subjects/useMySemester";

/**
 * A subject list with the student's own subjects first (the ones for their branch and semester, with
 * their chosen electives, and any they added themselves), then everything else in its usual order.
 */
export function useMineFirst<T extends { id: string }>(list: readonly T[]): T[] {
  const { picks } = useMySemester();
  return useMemo(() => {
    const rank = new Map(picks.map((id, i) => [id, i]));
    return [...list].sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity));
  }, [list, picks]);
}
