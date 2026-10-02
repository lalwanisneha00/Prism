import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { Dashboard } from "@/components/Dashboard";

export const metadata: Metadata = { title: "My study dashboard" };

export default function DashboardPage() {
  return (
    <Container className="flex flex-col gap-4 py-10 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight">My study dashboard</h1>
      <Dashboard />
    </Container>
  );
}
