"use client";

import { useCallback, useEffect, useState } from "react";
import { useDataVersion } from "@/components/account/AuthProvider";
import { PlanDays } from "@/components/planner/PlanDays";
import { PlanSetup } from "@/components/planner/PlanSetup";
import { deletePlan, listPlans } from "@/lib/planner/store";
import { upgradePlan } from "@/lib/planner/upgrade";
import type { StudyPlan } from "@/lib/storage/db";
import { findSubject } from "@/lib/subjects";

type State = { status: "loading" } | { status: "error" } | { status: "ready"; plans: StudyPlan[] };

const planName = (p: StudyPlan) =>
  p.title ?? (p.subjects ?? [p.subject]).map((s) => findSubject(s)?.name ?? s).join(", ");

/** The planner: set it up once (any subjects), then tick things off day by day (synced). */
export function PlannerView() {
  const dataVersion = useDataVersion();
  const [state, setState] = useState<State>({ status: "loading" });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(() => {
    listPlans()
      .then((plans) =>
        setState({
          status: "ready",
          plans: plans.map(upgradePlan).sort((a, b) => b.createdAt - a.createdAt),
        }),
      )
      .catch(() => setState({ status: "error" }));
  }, []);
  useEffect(load, [load, dataVersion]);

  if (state.status === "loading")
    return <div className="h-64 animate-pulse rounded-2xl bg-surface-2" aria-busy="true" />;
  if (state.status === "error")
    return (
      <p role="alert" className="rounded-2xl border border-border bg-surface p-5">
        This browser is blocking storage, so a plan can&apos;t be kept here.
      </p>
    );

  const { plans } = state;
  const active = plans.find((p) => p.id === activeId) ?? plans[0];

  if (!active || editing) {
    return (
      <PlanSetup
        replacing={Boolean(active)}
        onCancel={active ? () => setEditing(false) : undefined}
        onCreated={(plan) => {
          setEditing(false);
          setActiveId(plan.id);
          setState({ status: "ready", plans: [plan, ...plans.filter((p) => p.id !== plan.id)] });
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {plans.length > 1 && (
        <nav aria-label="Your plans" className="flex flex-wrap gap-2">
          {plans.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={p.id === active.id}
              onClick={() => setActiveId(p.id)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${p.id === active.id ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-surface-2"}`}
            >
              {planName(p)}
            </button>
          ))}
        </nav>
      )}
      <PlanDays
        plan={active}
        onChange={(plan) =>
          setState({ status: "ready", plans: plans.map((p) => (p.id === plan.id ? plan : p)) })
        }
        onReplan={() => setEditing(true)}
        onDelete={async () => {
          await deletePlan(active);
          setActiveId(null);
          setState({ status: "ready", plans: plans.filter((p) => p.id !== active.id) });
        }}
      />
    </div>
  );
}
