"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { useCustomSubjects } from "@/components/custom/useCustomSubjects";
import { useMyBranch } from "@/components/subjects/useMyBranch";
import { useMySemester } from "@/components/subjects/useMySemester";
import { NON_CORE, SEMESTERS, usuallyInSemester } from "@/lib/semester/mySemester";
import { subjects as catalogue, type Subject } from "@/lib/subjects";

const box =
  "flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface px-3 py-2 text-sm hover:bg-surface-2 has-checked:border-primary has-checked:bg-primary-soft has-focus-visible:outline-2 has-focus-visible:outline-primary";

function Check({
  checked,
  onChange,
  title,
  hint,
}: {
  checked: boolean;
  onChange: (on: boolean) => void;
  title: string;
  hint?: string;
}) {
  return (
    <label className={box}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 accent-primary"
      />
      <span className="flex flex-col">
        <span className="font-medium">{title}</span>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

/**
 * "My subjects this semester": the student says which semester they are in and ticks the subjects
 * their college teaches then (colleges differ), including non-core ones such as Indian Knowledge
 * System or Organisational Behaviour. Their choice is shown first in the lesson picker.
 */
export function SemesterSubjects() {
  const id = useId();
  const { mine } = useMyBranch();
  const { semester, picks, loaded, setSemester, toggle } = useMySemester();
  const custom = useCustomSubjects();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const matches = (s: { name: string }) => !q || s.name.toLowerCase().includes(q);
  const usual = useMemo(
    () => usuallyInSemester(catalogue, semester, mine.branch),
    [semester, mine.branch],
  );
  const usualIds = new Set(usual.map((s) => s.id));
  const others = catalogue.filter((s) => !usualIds.has(s.id));
  const byField = new Map<string, Subject[]>();
  for (const s of others.filter(matches))
    byField.set(s.field, [...(byField.get(s.field) ?? []), s]);

  const chosen = picks
    .map((pid) => catalogue.find((s) => s.id === pid) ?? custom.subjects.find((s) => s.id === pid))
    .filter((s): s is Subject => Boolean(s));
  // The student's own subjects that are not one of the suggested non-core names.
  const extraOwn = custom.records.filter(
    (r) => !NON_CORE.some((n) => n.name.toLowerCase() === r.name.toLowerCase()) && matches(r),
  );

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5"
      data-testid="semester-subjects"
    >
      <div>
        <h2 id={`${id}-title`} className="text-xl font-semibold">
          My subjects this semester
        </h2>
        <p className="mt-1 text-sm text-muted">
          Colleges differ: one teaches a subject in semester 1, another in semester 2. Say which
          semester you are in and tick what your college teaches; those subjects come first in the
          lesson maker.
        </p>
      </div>

      <label className="flex w-fit flex-col gap-1 text-sm" htmlFor={`${id}-sem`}>
        <span className="font-semibold">My semester</span>
        <select
          id={`${id}-sem`}
          value={semester ?? ""}
          onChange={(e) => setSemester(e.target.value ? Number(e.target.value) : undefined)}
          className="rounded-xl border border-border bg-bg px-3 py-2 text-sm"
        >
          <option value="">Choose…</option>
          {SEMESTERS.map((s) => (
            <option key={s} value={s}>
              Semester {s}
            </option>
          ))}
        </select>
      </label>

      {!loaded && <div className="h-16 animate-pulse rounded-xl bg-surface-2" aria-busy="true" />}

      {loaded && !semester && (
        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
          Choose your semester to pick its subjects.
        </p>
      )}

      {loaded && semester && (
        <>
          {chosen.length > 0 ? (
            <ul className="grid gap-2 sm:grid-cols-2" data-testid="semester-picks">
              {chosen.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm"
                >
                  <Link href={`/subjects/${s.id}`} className="font-semibold hover:underline">
                    {s.name}
                  </Link>
                  <button
                    type="button"
                    onClick={() => toggle(s.id, false)}
                    aria-label={`Remove ${s.name} from semester ${semester}`}
                    className="text-xs font-semibold text-muted underline"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
              No subjects chosen for semester {semester} yet.
            </p>
          )}

          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="w-fit rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-fg hover:bg-primary-hover"
          >
            {open ? "Done" : `Choose subjects for semester ${semester}`}
          </button>

          {open && (
            <div className="flex flex-col gap-5 border-t border-border pt-4">
              <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-q`}>
                <span className="font-semibold">Find a subject</span>
                <input
                  id={`${id}-q`}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type part of a name"
                  className="rounded-xl border border-border bg-bg px-3 py-2"
                />
              </label>

              {usual.filter(matches).length > 0 && (
                <fieldset className="flex flex-col gap-2">
                  <legend className="text-sm font-semibold">
                    Usually taught in semester {semester}
                    {mine.branch ? " for your branch" : ""}
                  </legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {usual.filter(matches).map((s) => (
                      <Check
                        key={s.id}
                        checked={picks.includes(s.id)}
                        onChange={(on) => toggle(s.id, on)}
                        title={s.name}
                        hint={s.field}
                      />
                    ))}
                  </div>
                </fieldset>
              )}

              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-semibold">
                  Other subjects (your college may teach these in semester {semester})
                </legend>
                {[...byField].map(([field, list]) => (
                  <details
                    key={field}
                    open={Boolean(q)}
                    className="rounded-xl border border-border p-2"
                  >
                    <summary className="cursor-pointer text-sm font-semibold">
                      {field} <span className="font-normal text-muted">({list.length})</span>
                    </summary>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {list.map((s) => (
                        <Check
                          key={s.id}
                          checked={picks.includes(s.id)}
                          onChange={(on) => toggle(s.id, on)}
                          title={s.name}
                          hint={`Often semester ${s.semesters.join(" or ")}`}
                        />
                      ))}
                    </div>
                  </details>
                ))}
                {byField.size === 0 && q && (
                  <p className="text-sm text-muted">No subject matches &ldquo;{query}&rdquo;.</p>
                )}
              </fieldset>

              <fieldset className="flex flex-col gap-2" data-testid="non-core">
                <legend className="text-sm font-semibold">
                  Non-core subjects (these differ a lot between colleges)
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {NON_CORE.filter(matches).map((n) => {
                    if (n.builtInId) {
                      return (
                        <Check
                          key={n.name}
                          checked={picks.includes(n.builtInId)}
                          onChange={(on) => toggle(n.builtInId!, on)}
                          title={n.name}
                          hint="Built in"
                        />
                      );
                    }
                    const own = custom.records.find(
                      (r) => r.name.toLowerCase() === n.name.toLowerCase(),
                    );
                    return own ? (
                      <Check
                        key={n.name}
                        checked={picks.includes(own.id)}
                        onChange={(on) => toggle(own.id, on)}
                        title={n.name}
                        hint="Set up from your syllabus"
                      />
                    ) : (
                      <Link
                        key={n.name}
                        href={`/my-subjects/new?name=${encodeURIComponent(n.name)}&semester=${semester}`}
                        className={box}
                      >
                        <span className="flex flex-col">
                          <span className="font-medium">+ {n.name}</span>
                          <span className="text-xs text-muted">
                            Add it with your own syllabus or notes
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
                {extraOwn.length > 0 && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {extraOwn.map((r) => (
                      <Check
                        key={r.id}
                        checked={picks.includes(r.id)}
                        onChange={(on) => toggle(r.id, on)}
                        title={r.name}
                        hint="Your own subject"
                      />
                    ))}
                  </div>
                )}
                <Link
                  href={`/my-subjects/new?semester=${semester}`}
                  className="w-fit text-sm font-semibold text-primary underline"
                >
                  Add another subject of my own
                </Link>
              </fieldset>
            </div>
          )}
        </>
      )}
    </section>
  );
}
