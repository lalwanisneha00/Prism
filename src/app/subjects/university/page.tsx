import { redirect } from "next/navigation";

/** The old "hide what my university skips" page: syllabus upload now lives on /subjects. */
export default function UniversityPage() {
  redirect("/subjects");
}
