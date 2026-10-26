"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDataVersion } from "@/components/account/AuthProvider";
import { hasMaterialFor } from "@/lib/custom/store";

/**
 * "Start a lesson" on a course page. For a non-core course without the faculty's material, it
 * goes straight to that course's upload page instead (lessons need the material).
 */
export function StartLessonLink({
  subjectId,
  needsMaterial,
  className,
}: {
  subjectId: string;
  needsMaterial: boolean;
  className: string;
}) {
  const dataVersion = useDataVersion();
  const [has, setHas] = useState<boolean | null>(needsMaterial ? null : true);
  useEffect(() => {
    if (!needsMaterial) return;
    let live = true;
    hasMaterialFor(subjectId)
      .then((h) => live && setHas(h))
      .catch(() => live && setHas(false));
    return () => {
      live = false;
    };
  }, [subjectId, needsMaterial, dataVersion]);

  const upload = needsMaterial && has === false;
  return (
    <Link
      href={upload ? `/notes?subject=${subjectId}` : `/start?subject=${subjectId}`}
      className={className}
      data-testid="start-lesson"
    >
      {upload ? "Start a lesson (upload material first)" : "Start a lesson"}
    </Link>
  );
}
