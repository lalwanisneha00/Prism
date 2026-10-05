import { Icon } from "@/components/Icon";
import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/Container";
import { Dashboard } from "@/components/Dashboard";

export const metadata: Metadata = { title: "My study dashboard" };

export default function DashboardPage() {
  return (
    <Container className="flex flex-col gap-4 py-10 sm:py-14">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">My study dashboard</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/map"
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-2"
          >
            <Icon name="map" /> Concept map
          </Link>
          <Link
            href="/my-notes"
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-2"
          >
            <Icon name="note" /> My Notes
          </Link>
        </div>
      </div>
      <Dashboard />
    </Container>
  );
}
