# data/subjects

One JSON file per subject. Adding a subject means adding a file here: `scripts/build-subject-index.mjs` picks it up automatically (it runs before `dev`, `build` and `test`), and the whole catalogue is validated when the app starts (`src/lib/subjects.ts`).

## A subject file (`<id>.json`)

| Field            | Meaning                                                                                                                                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`             | lowercase-kebab-case, never changed once published                                                                                                                                                                             |
| `name`, `field`  | shown in the picker                                                                                                                                                                                                            |
| `tier`           | `verified`, `tested`, `sourced` or `limited` (SPEC §6.1, §12.3)                                                                                                                                                                |
| `branches`       | branch ids from `src/data/branches.json`, or `["all"]` for the first-year common core. A subject used by several branches is stored once.                                                                                      |
| `semesters`      | the semesters it is usually taught in (1–8)                                                                                                                                                                                    |
| `syllabusSource` | `{ kind, title, url?, note? }` where the chapter/topic list comes from (AICTE, UGC, a university, a textbook, NPTEL, or `none`). Never written from memory.                                                                    |
| `visualSet`      | optional preferred visual set (`physics`, `maths`, `circuits`, `mechanics`, `thermal`, `fluids`, `signals`, `computing`, `chemistry`, `civil`, `process`, `theory`)                                                            |
| `links`          | optional `[{ subject, chapters? }]`: chapters of another subject that also belong here (shown here, taught and saved under their owner, never copied)                                                                          |
| `chapters`       | `[{ id, name, hours?, marks?, topics: [{ id, name, requires? }] }]`. `hours`/`marks` come from the syllabus when it gives them (chapter time estimates use them). `requires` lists prerequisite topic ids in the same subject. |

## Grounding sources (`<id>-sources.json`)

Which OpenStax sections and Wikipedia pages back each topic (`src/lib/sources.ts`). Also picked up automatically.

## Rules

- Ids are locked: `src/lib/subjectIds.lock.json` lists every published `subject/chapter/topic` id. Saved progress, highlights and library lessons are keyed by them, so they can be added to but never renamed or removed (a test fails otherwise). Add new ids to the lock when a subject is published.
- Never invent a syllabus: record its source; with no reliable syllabus, say so and use the `limited` tier.
