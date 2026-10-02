import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { PlannerView } from "@/components/planner/PlannerView";

export const metadata: Metadata = { title: "Backlog planner" };

export default function PlannerPage() {
  return (
    <Container className="flex flex-col gap-6 py-10 sm:py-14">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Backlog planner</h1>
        <p className="mt-2 text-muted">
          Behind on a subject? Pick what you need to cover and how much time you have; Prism turns
          it into a day-by-day plan you can tick off on any device.
        </p>
      </div>
      <PlannerView />
    </Container>
  );
}
