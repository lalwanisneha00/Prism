# data/subjects

One JSON file per subject, **generated from PDEU's syllabus** by `scripts/build-pdeu-subjects.mjs` (see `CHANGES.md`). `scripts/build-subject-index.mjs` picks the files up automatically (it runs before `dev`, `build` and `test`), and the whole catalogue is validated when the app starts (`src/lib/subjects.ts`).

Regenerate (only when PDEU's handbooks change; needs the folder of the previous subject files for topic-id reuse): see the header of `scripts/build-pdeu-subjects.mjs`.

## A subject file (`<id>.json`)

`id`, `name`, `field`, `tier`, `branches` (PDEU branch ids), `semesters`, `code`, `credits`, `ltp`, `category`, `offerings` (per branch: semester, code, credits, L-T-P and the key of the course's PDEU page), `syllabusSource`, optional `visualSet`, `chapters` (PDEU units: `id`, `name`, `hours`, `topics` with `id`, `name`, `requires`).

Topic ids may be shared by several subjects (a reused earlier topic id keeps its sources and widgets); they are unique inside a subject. A subject id must not end in `-sources` (that is the sources file name).

## Grounding sources (`<id>-sources.json`)

Which OpenStax sections and Wikipedia pages back each topic (`src/lib/sources.ts`); only topics that reused an earlier topic have them.

## Rules

- Ids are locked: `src/lib/subjectIds.lock.json` lists every published `subject/chapter/topic` id; saved progress is keyed by them (a test fails if one disappears).
- Never invent a syllabus: it is PDEU's handbook text.
