import { CourseTags, RelatedCourseLine } from "@/components/subjects/CourseTags";
import { CourseBadge } from "@/components/subjects/TrustBadge";
import { activeCourse, relatedOf } from "@/lib/catalogue";
import { ltpText } from "@/lib/pdeu/helpers";
import { findBranch, type Subject } from "@/lib/subjects";
import { resolveMeta } from "@/lib/syllabusFix/tree";

/*
 * The facts at the top of a PDEU course page (Phase 4B): code, Core/Non-core and Theory/Practical
 * tags, where it is taught, teaching scheme and credits, how sure Prism is of the syllabus, and the
 * linked theory course or lab. Everything comes from the course data; only the trust badge also
 * reads the live fixes (Phase 7).
 */

export function CourseSummary({ subject }: { subject: Subject }) {
  const meta = resolveMeta(subject);
  const offerings = subject.offerings ?? [];
  const code = subject.code ?? offerings.find((o) => o.code)?.code;
  // Where it is taught: one line per branch and semester.
  const places = [
    ...new Set(
      offerings.map((o) => `${findBranch(o.branch)?.name ?? o.branch}, semester ${o.semester}`),
    ),
  ];
  // Teaching scheme and credits; branches usually agree, so each distinct one shows once.
  const schemes = [
    ...new Set(
      offerings
        .map((o) =>
          [
            o.ltp ? ltpText(o.ltp) : "",
            o.credits ? `${o.credits} credit${o.credits === 1 ? "" : "s"}` : "",
          ]
            .filter(Boolean)
            .join(" · "),
        )
        .filter(Boolean),
    ),
  ];
  const indexed = activeCourse(subject.id);
  const related = indexed ? relatedOf(indexed) : [];
  const isLab = subject.courseType === "practical";
  return (
    <div className="flex flex-col gap-3" data-testid="course-summary">
      <CourseTags
        {...(subject.courseCategory ? { category: subject.courseCategory } : {})}
        {...(subject.courseType ? { type: subject.courseType } : {})}
      />
      <dl className="grid max-w-2xl gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
        {code && (
          <>
            <dt className="font-semibold">Course code</dt>
            <dd className="text-muted">{code}</dd>
          </>
        )}
        <dt className="font-semibold">Taught in</dt>
        <dd className="text-muted">
          {places.length > 0 ? places.join("; ") : "Semester not confirmed yet"}
        </dd>
        {schemes.length > 0 && (
          <>
            <dt className="font-semibold">Teaching scheme</dt>
            <dd className="text-muted">{schemes.join("; ")}</dd>
          </>
        )}
      </dl>
      <CourseBadge subjectId={subject.id} meta={meta} />
      <RelatedCourseLine
        isLab={isLab}
        related={related.filter((r) => (r.courseType === "practical") !== isLab)}
      />
    </div>
  );
}
