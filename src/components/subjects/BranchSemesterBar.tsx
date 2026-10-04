"use client";

import { useId } from "react";
import type { MyBranch } from "@/components/subjects/useMyBranch";
import { branches, semestersFor } from "@/lib/subjects";

const selectClass =
  "rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg focus-visible:outline-2 focus-visible:outline-primary";

/** Branch and semester dropdowns; the choice is saved as "my branch and semester". */
export function BranchSemesterBar({
  mine,
  onChange,
}: {
  mine: MyBranch;
  onChange: (next: MyBranch) => void;
}) {
  const id = useId();
  const semesters = mine.branch ? semestersFor(mine.branch) : [];
  return (
    <div className="flex flex-wrap items-end gap-3" data-testid="branch-bar">
      <label htmlFor={`${id}-branch`} className="flex flex-col gap-1 text-sm">
        <span className="font-semibold">My branch</span>
        <select
          id={`${id}-branch`}
          value={mine.branch ?? ""}
          onChange={(e) =>
            onChange(e.target.value ? { branch: e.target.value, semester: mine.semester } : {})
          }
          className={selectClass}
        >
          <option value="">Any branch</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <label htmlFor={`${id}-semester`} className="flex flex-col gap-1 text-sm">
        <span className="font-semibold">Semester</span>
        <select
          id={`${id}-semester`}
          value={mine.semester ?? ""}
          disabled={!mine.branch}
          onChange={(e) =>
            onChange({
              branch: mine.branch,
              ...(e.target.value ? { semester: Number(e.target.value) } : {}),
            })
          }
          className={selectClass}
        >
          <option value="">Any semester</option>
          {semesters.map((s) => (
            <option key={s} value={s}>
              Semester {s}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
