/** Shown on every non-core subject (subject page, lesson picker, My subjects) with an upload button. */
export const NON_CORE_UPLOAD_MESSAGE =
  "Upload material given by faculty to generate lessons for this subject.";

/** A non-core PDEU subject is a skeleton: lessons come only from the student's uploaded material. */
export function needsFacultyMaterial(subject: { courseCategory?: string }): boolean {
  return subject.courseCategory === "non-core";
}
