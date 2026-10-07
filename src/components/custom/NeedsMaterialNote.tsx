import Link from "next/link";

/** The same line and link everywhere for a subject saved with just its name (no units or material yet). */
export function NeedsMaterialNote({ subjectId }: { subjectId: string }) {
  return (
    <div
      className="flex flex-col gap-1 rounded-xl bg-primary-soft px-3 py-2 text-sm"
      data-testid="needs-setup"
    >
      <p>
        Upload the material given by your faculty to study this subject here. This is optional and
        you can do it any time.
      </p>
      <Link
        href={`/my-subjects/edit?id=${subjectId}`}
        className="w-fit font-semibold text-primary underline"
      >
        Add syllabus or material
      </Link>
    </div>
  );
}
