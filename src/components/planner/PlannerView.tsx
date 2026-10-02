"use client";

import { useCallback, useEffect, useState } from "react";
import { useDataVersion } from "@/components/account/AuthProvider";
import { PlanDays } from "@/components/planner/PlanDays";
import { PlanSetup } from "@/components/planner/PlanSetup";
import { deletePlan, getPlan } from "@/lib/planner/store";
import type { StudyPlan } from "@/lib/storage/db";
import { subjects } from "@/lib/subjects";

type State =
  { status: "loading" } | { status: "error" } | { status: "ready"; plan: StudyPlan | null };

/** The backlog planner: set it up once, then tick things off day by day (synced). */
export function PlannerView() {
  const dataVersion = useDataVersion();
  const [subjectId, setSubjectId] = useState(subjects[0].id);
  const [state, setState] = useState<State>({ status: "loading" });
  const [editing, setEditing] = useState(false);

  const load = useCallback(() => {
    getPlan(subjectId)
      .then((plan) => setState({ status: "ready", plan }))
      .catch(() => setState({ status: "error" }));
  }, [subjectId]);
  useEffect(load, [load, dataVersion]);

  const subject = subjects.find((s) => s.id === subjectId)!;

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Subject" className="flex flex-wrap gap-2">
        {subjects.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={s.id === subjectId}
            onClick={() => {
              setSubjectId(s.id);
              setEditing(false);
              setState({ status: "loading" });
            }}
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${s.id === subjectId ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-surface-2"}`}
          >
            {s.name}
          </button>
        ))}
      </nav>

      {state.status === "loading" && (
        <div className="h-64 animate-pulse rounded-2xl bg-surface-2" aria-busy="true" />
      )}
      {state.status === "error" && (
        <p role="alert" className="rounded-2xl border border-border bg-surface p-5">
          This browser is blocking storage, so a plan can&apos;t be kept here.
        </p>
      )}
      {state.status === "ready" &&
        (state.plan && !editing ? (
          <PlanDays
            plan={state.plan}
            subject={subject}
            onChange={(plan) => setState({ status: "ready", plan })}
            onReplan={() => setEditing(true)}
            onDelete={async () => {
              await deletePlan(state.plan!);
              setState({ status: "ready", plan: null });
            }}
          />
        ) : (
          <PlanSetup
            subject={subject}
            replacing={Boolean(state.plan)}
            onCancel={state.plan ? () => setEditing(false) : undefined}
            onCreated={(plan) => {
              setEditing(false);
              setState({ status: "ready", plan });
            }}
          />
        ))}
    </div>
  );
}
