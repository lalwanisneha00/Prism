import type { Metadata } from "next";
import { AdminSyllabus } from "@/components/admin/AdminSyllabus";
import { Container } from "@/components/Container";

// Syllabus fix, Phase 6. Anyone can load this page, but every queue and action comes from
// /api/admin/syllabus, which only answers accounts listed in ADMIN_UID.
export const metadata: Metadata = {
  title: "Syllabus admin",
  robots: { index: false, follow: false },
};

export default function AdminSyllabusPage() {
  return (
    <Container className="flex flex-col gap-6 py-10 sm:py-14">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Syllabus admin</h1>
        <p className="text-muted">
          Student fixes, conflicts, flagged lessons and import items to check.
        </p>
      </div>
      <AdminSyllabus />
    </Container>
  );
}
