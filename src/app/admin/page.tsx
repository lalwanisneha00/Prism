import { redirect } from "next/navigation";

// /admin has one page so far: the syllabus queues (syllabus fix, Phase 6).
export default function AdminPage() {
  redirect("/admin/syllabus");
}
