import { z } from "zod";

/*
 * PDEU's official B.Tech syllabus as data (src/data/pdeu/<branch>.json, made from the university's
 * curriculum handbooks by scripts/build-pdeu.mjs). Everything here is copied from the handbooks:
 * codes, categories, L-T-P, credits, units with hours and topics, lab experiments. A course whose
 * handbook page prints no syllabus has no units and says so in `notes`.
 */

const UnitSchema = z.object({
  number: z.number(),
  title: z.string(),
  hours: z.number().optional(),
  topics: z.array(z.string()),
});

const CourseFields = {
  /** Page key, unique inside the branch. */
  key: z.string(),
  /** The code as printed; some handbook rows have no code yet. */
  code: z.string().optional(),
  name: z.string(),
  /** Basic Science, Engineering Science, Program Core, Humanities & Social Science … */
  category: z.string(),
  /** Lecture-tutorial-practical hours per week, e.g. "3-1-0". */
  ltp: z.string().optional(),
  credits: z.number(),
  creditsNote: z.string().optional(),
  track: z.string().optional(),
  /** Which elective slot an option belongs to ("PE-1"). */
  slot: z.string().optional(),
  units: z.array(UnitSchema),
  /** Lab courses list experiments instead of units. */
  experiments: z.array(z.string()).optional(),
  notes: z.array(z.string()).optional(),
};

const OptionSchema = z.object(CourseFields);
export type PdeuOption = z.infer<typeof OptionSchema>;

const CourseSchema = z.object({
  ...CourseFields,
  semester: z.number().int().min(1).max(8),
  /** PDEU's own split: core (science, engineering science, program core and electives, project) or not. */
  core: z.boolean(),
  /** An elective slot lists the choices a student can pick from. */
  options: z.array(OptionSchema).optional(),
  /** Slots that share their options with another slot ("PE-2 / PE-3") name the slot that lists them. */
  optionsListedUnder: z.string().optional(),
});
export type PdeuCourse = z.infer<typeof CourseSchema>;

export const PdeuBranchSchema = z.object({
  id: z.string(),
  name: z.string(),
  short: z.string(),
  department: z.string(),
  handbook: z.string(),
  credits: z.record(
    z.string(),
    z.object({ core: z.number(), notCore: z.number(), total: z.number() }),
  ),
  notes: z.array(z.string()),
  subjects: z.array(CourseSchema),
});
export type PdeuBranch = z.infer<typeof PdeuBranchSchema>;

/** Anything the pages show: a course or one option of an elective slot. */
export type PdeuAnyCourse = PdeuCourse | (PdeuOption & { semester?: number; core?: boolean });
