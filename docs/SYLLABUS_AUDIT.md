# Syllabus Fix: Audit

Working notes for the syllabus fix (plan: `PRISM_SYLLABUS_FIX.md`, root). A fresh session reads this file first, then only the next phase of the plan. Keep under ~250 lines.

## 1. Tech stack

| Part      | What Prism uses                                                                                                                                                                                                                                                            |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework | Next.js 16.3.8 (App Router, read `node_modules/next/dist/docs/` before writing Next code), React 19, TypeScript strict, Zod 4, Tailwind 4                                                                                                                                  |
| Syllabus  | **Static JSON files in the repo**, bundled into the app at build time. Not in any database.                                                                                                                                                                                |
| User data | IndexedDB on the device is the main copy (`src/lib/storage/db.ts`, `idb`), synced through an outbox (`src/lib/sync/engine.ts`) to Firestore `users/{uid}/{collection}/{id}` (`src/lib/sync/adapters.ts`)                                                                   |
| Shared DB | Firestore (free Spark plan). Only shared collection today: `lessons/{key}` (shared lesson library), written only by the server via Admin SDK (`src/lib/library/adminStore.ts`, `src/lib/firebase/admin.ts`)                                                                |
| Auth      | Firebase Auth, Google sign-in popup (`src/components/account/AuthProvider.tsx`). Server checks ID tokens with the Admin SDK. No admin role exists yet.                                                                                                                     |
| AI        | `src/lib/llm/` (server-only). Chain from env: Gemini free tier (`gemini-flash-latest`, fallbacks `gemini-flash-lite-latest`, `gemini-3.1-flash-lite`), then Groq (`openai/gpt-oss-120b`). Optional Mistral/OpenRouter, no keys. Students may bring their own key (`byok`). |
| Tests     | Vitest (`*.test.ts` next to files), Playwright e2e. `npm run check`, `npm run build`.                                                                                                                                                                                      |
| Hosting   | Vercel free tier                                                                                                                                                                                                                                                           |

## 2. Where the syllabus lives now

Two PDEU datasets, both generated from one merged handbook extraction:

1. **Subjects (what students study):** `src/data/subjects/pdeu-*.json`, 298 subject files (plus `-sources.json` files). Built by `scripts/build-pdeu-layer.mjs` from `data/university/pdeu/syllabus-extracted.json` + `mapping.json`. 1,221 chapters, 11,058 topics.
   - Shape: `{ id, name, field, tier, university: "pdeu", courseCategory: core|non-core, branches: [..], semesters: [..], code, credits, ltp, category, offerings: [{branch, key, code, semester, kind, credits, ltp, category}], syllabusSource, chapters: [{ id, name, hours, topics: [{ id, name, requires? }] }], links? }`
   - Branch/semester link = `branches` + `semesters` + `offerings[]` on the subject. Chapter → subject and topic → chapter is **nesting** (array position = order). No `parent_id`, `order_index`, `status`, `batch_year`, `source`, `confidence`.
   - `links` lets a subject borrow chapters owned by another subject (`chaptersOf` in `src/lib/subjects.ts`).
   - **Phase 1 tree fields (all optional, in `SubjectSchema`):** every node (subject, chapter, topic) may have `source` (`official_site|admin_handout|student_handout|student_fix`), `confidence` (`unverified|pending|verified`), `status` (`active|retired`), `verifiedByCount`. Subjects also `batchYears`, `sameAs` (main copy of a duplicated course), `movedTo`; chapters/topics `movedFrom: {subject, chapter?, at}`. A missing field is **inherited** from the parent (`resolveMeta` in `src/lib/syllabusFix/tree.ts`); a retired course/chapter retires its children. Course code = existing `code`; parent = nesting; order = array position; branch/semester = `branches`/`semesters`/`offerings`. All 301 PDEU subjects carry `official_site/unverified/active/0` at subject level (migration `001`).
   - Retired subjects are hidden from `subjects` (`src/lib/subjects.ts`) and `subjectIndex` (`src/lib/catalogue.ts`) but `findSubject`/`indexedSubject` still find them. The light index only carries non-default `source/confidence/status`.
   - `scripts/build-pdeu-layer.mjs` **deletes and rebuilds** all `pdeu-*.json`: now refuses to run without `--rebuild-from-scratch`. Never use it again; edit files in place.
2. **Handbook view (credits, Core/Non-core, electives):** `src/data/pdeu/<branch>.json` (+ `overrides.json`, `subject-map.json`, `prism-match.json`), built by `scripts/build-pdeu.mjs`. Loaded by `src/lib/pdeu/load.ts`; used by `/pdeu/[branch]/[key]`, My subjects, electives (`src/lib/pdeu/electives.ts`).
3. **Topic bank:** the older non-PDEU subject files in `src/data/subjects/*.json` (`bankSubjects`). Hidden, but lookups by id still work. PDEU topics reuse their ids (445 topics), and their golden sets / evals belong to them.
4. Index: `scripts/build-subject-index.mjs` writes `src/data/subjects/index.generated.ts` (runs before dev/build/test). `src/lib/subjects.ts` loads, validates (`SubjectSchema`, `catalogueProblems`) and exposes `subjects`, `subjectsFor(branch, sem)`, `findSubject`, `chaptersOf`. IDs are locked: `src/lib/subjectIds.lock.json`.
5. Branch list: `src/data/branches.json` (7 branches: `ce, ict, ece, me, civil, petro, biotech`). `PDEU_BRANCH_IDS` in `src/lib/pdeu/load.ts`.

### Data problems found

- **ICT bug confirmed:** no AI course in any ICT semester. "Introduction to Artificial Intelligence" exists only as separate copies for biotech (s3), civil (s3), petro (s3), ce (s5).
- **ME bug likely cause:** all ME course codes are 2016 to 2019 scheme (`16ME101T`, `18ME304T`), while other branches use the 2024 scheme (`24...`). The ME data comes from an older handbook. Sem 7 and 8 have only 3 core courses each.
- **Duplicated courses:** 17 real course codes appear in more than one subject file (e.g. `24PH101T`: `pdeu-applied-physics` and `pdeu-physics-ict`; `24CP101T`: `-ce` and `-petro` copies). Common courses were copied per branch, not shared.
- **Missing codes:** 96 of 298 subjects have no code or a placeholder (`24ICxxxT`, `24ECE***T`, `UG_1_T`). Matching by code will fail for them; fuzzy title is needed.
- `data/university/pdeu/extraction-report.txt` lists other known extraction gaps (empty units, repeated codes).

## 3. Everything that depends on syllabus IDs

All keyed by **subject id + topic id** strings (chapter id in a few places). Topic ids are unique only inside a subject.

| What                  | Where                                                                                                                                                | Key                                                                                                                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Saved lessons         | IndexedDB `savedLessons` (synced)                                                                                                                    | `subject`, `topic`; may hold only a library key                                                                                                                                         |
| Recent topics         | `recentTopics`                                                                                                                                       | subject, topic                                                                                                                                                                          |
| Quiz attempts         | `quizAttempts`                                                                                                                                       | subject, topic                                                                                                                                                                          |
| Mock tests            | `mockResults` (`byTopic[]`)                                                                                                                          | subject, topic ids                                                                                                                                                                      |
| Weak topics           | `learningSignals` + quiz/mock scores, `src/lib/priority/`                                                                                            | subject, topic                                                                                                                                                                          |
| Highlights / comments | `annotations` (index `byLesson`), `src/lib/annotations/`                                                                                             | lessonId (contains subject/topic)                                                                                                                                                       |
| Chapter lessons       | `chapterLessons`                                                                                                                                     | subject + chapter id                                                                                                                                                                    |
| Notes, flashcards     | `notes`, `noteSummaries`, `flashcards`                                                                                                               | subject/topic                                                                                                                                                                           |
| Planner               | `plans` (items have `topicId`), `src/lib/planner/`                                                                                                   | subject, topicId                                                                                                                                                                        |
| Settings              | `AppSettings` in `settings`                                                                                                                          | `mySubjects` (sem → subject ids), `electiveChoices` (`branch/slot`), `importanceOverrides` (`subject/topic`, `subject/chapter:<id>`), `universityScope` (subject → chapter → topic ids) |
| Shared lesson library | Firestore `lessons/{subject}_{topic}_{level}_{durationMin}` (`src/lib/library/sharedLibrary.ts`)                                                     | Already has a stale check: `promptVersion` mismatch = regenerate                                                                                                                        |
| Search ranking        | `src/lib/catalogueSearch.ts` (`searchCatalogue`), `subjectsFor` in `src/lib/subjects.ts`, `src/lib/semester/mySemester.ts`, `src/lib/topicSearch.ts` | reads `subjects`                                                                                                                                                                        |
| Concept map           | `src/lib/conceptMap.ts` (topic `requires`)                                                                                                           | topic ids                                                                                                                                                                               |
| Evals / golden sets   | `eval/`, `src/data/accuracy.json`, `evalStatus.json`                                                                                                 | bank subject/topic ids. **Out of scope, do not touch.**                                                                                                                                 |

**ID lock:** `src/lib/subjectIds.lock.json` stores `subject/chapter/topic` triples and `subjects.test.ts` fails if one disappears. Moving a topic to another chapter (Phase 2) must update the lock deliberately (e.g. keep the old triple resolvable through `movedFrom`, and adjust the test to accept a triple whose topic has `movedFrom` that chapter).

**Key rule from this:** a topic can move between chapters of the same subject freely (keys use subject + topic, not chapter). Moving a topic or chapter to a **different subject** changes the owner, so saved data would point at the old subject. Fix: keep the old owner reachable (a `movedTo`/alias lookup) instead of renaming keys.

## 4. Upload pipeline (V2.5) and extraction

- File text extraction (browser, free, local): `src/lib/extract/` (`pdf.ts` via `pdfjs-dist`, docx, pptx, odf, xlsx), OCR `src/lib/ocr/` (`tesseract.js`).
- Whole-syllabus parser, rule-based, no AI: `src/lib/university/parse.ts` (`UniSubject`: name, code, semester, credits, outcomes, units, `unclear[]`). AI fallback: `src/lib/university/ai.ts` (`AiSyllabusSchema`, `chunkText`, `mergeSyllabi`) via `/api/syllabus`.
- Matching to Prism subjects: `src/lib/university/match.ts` (`nameSimilarity`, `topicCoverage`, candidates), applying a personal scope: `apply.ts`. Semester-syllabus uploads: `src/lib/syllabus/` (`propose.ts`, `coverage.ts`). Custom subjects: `src/lib/custom/` (`matchSyllabus.ts`, `syllabusText.ts`).
- Today all upload results are **personal** (stored in the student's settings), never shared.
- Node-side PDF libs already installed: `pdfjs-dist` (text), `pdf-lib` (split/copy pages). Both free. Use them for `scripts/split-handouts` and `scripts/import-handouts`.

## 5. Profile: branch, semester, batch year

- `AppSettings.branch` (one of the 7 ids) and `AppSettings.semester` (1 to 8), stored in IndexedDB `settings`, synced to `users/{uid}/settings`.
- **No batch year anywhere.** Phase 1 adds optional `batchYear` to `AppSettings` (additive).
- Users who are not signed in still have local settings; voting needs sign-in (Phase 6).

## 6. Branch folder mapping (`handouts/`)

| Folder  | Prism branch id | Status                                                            |
| ------- | --------------- | ----------------------------------------------------------------- |
| COMP    | `ce`            | 8 PDFs                                                            |
| ICT     | `ict`           | 8 PDFs                                                            |
| ECE     | `ece`           | 8 PDFs                                                            |
| MECH    | `me`            | 8 PDFs                                                            |
| CIVIL   | `civil`         | 8 PDFs                                                            |
| PETRO   | `petro`         | 8 PDFs                                                            |
| BIOTECH | `biotech`       | 8 PDFs                                                            |
| ELEC    | new `elec`      | 8 PDFs. Owner decided: add Electrical as a new branch in Phase 2. |
| CHEM    | new `chem`      | 8 PDFs. Owner decided: add Chemical as a new branch in Phase 2.   |
| CSBS    | **none**        | Folders empty. Skipped (plan says so).                            |
| CSSE    | **none**        | Folder deleted by the owner on 2026-10-25. Skipped.               |

Each semester folder holds one PDF named `<Branch>_Semester_<N>_Course_Handout.pdf`, i.e. **one combined PDF per semester**, so the split step is needed everywhere. CSBS/CSSE: there is no Prism data for them, so nothing to protect yet.

## 7. Risks

1. **Handout PDFs are public.** They were committed and pushed (`27042ac`, 72 PDFs, ~28 MB) to a **public** repo before this plan said not to. `.gitignore` + `git rm --cached` stops tracking but they stay in history; full removal needs a history rewrite and force push. Owner chose option (a): untracked and git-ignored at the Phase 0 commit; they remain visible in old commits (history not rewritten).
2. Syllabus is code, not data in a DB: "migrations" for the syllabus = scripts that edit JSON + git. Live student-driven changes (Phases 3 to 6) need a new shared store (Firestore) that is merged on top of the JSON at runtime.
3. Moving content across subjects breaks `subject + topic` keys unless aliases are kept (see section 3).
4. Merging duplicated common courses into one subject would change subject ids. Don't merge ids; mark one as the main copy and link the others.
5. Two PDEU datasets (`src/data/pdeu/` and `src/data/subjects/pdeu-*`) must stay in agreement.
6. `subjectIds.lock.json` and catalogue tests will fail on retired/added ids unless updated deliberately.
7. Firestore Spark limits: 50k reads, 20k writes per day, 1 GiB. The live overlay must be one small cached read per visit, not per topic.
8. Gemini free quota (~300 lessons/day) limits AI fallback in the import; use rule-based parsing first.
9. Admin role must be enforced in the server routes and Firestore rules (owner's uid in a server env var), not in the UI.

## 7b. Phase 1 building blocks (use these in later phases)

- **History (`syllabus_history`):** `src/lib/syllabusFix/history.ts` (`HistoryEntrySchema`: id, at, actor {kind script|admin|student|system, id?}, cause, target {kind catalogue|branch|subject|chapter|topic, subject?, chapter?, topic?}, field, oldValue, newValue, reverted, revertedBy?; `historyEntry`, `parseHistory`, `formatHistory`, `markReverted`). Script/admin changes: `data/university/pdeu/history.jsonl` (in git). Live changes (Phase 5): Firestore `syllabusHistory`, same shape.
- **Stale lessons:** `src/data/syllabus/stale-topics.json` (`{version:1, topics: {"subject/topic": ISO time}}`), `src/lib/syllabusFix/stale.ts` (`isLessonStale`, `markStale`). `readFromLibrary` (`src/lib/library/sharedLibrary.ts`) treats a library lesson written before its topic's change time as missing, so it is regenerated on next open. No bulk writes. Not yet applied to the student's own `savedLessons` (Phase 7).
- **Migrations:** `scripts/syllabus-migrations/NNN-*.ts`, run with `npx tsx --tsconfig tsconfig.json <file> up|down`; `down` only removes values the migration wrote, and both directions log to `history.jsonl`. Run `npx prettier --write "src/data/subjects/pdeu-*.json"` after any script that writes subject files.
- **Batch year:** `AppSettings.batchYear?` (`src/lib/storage/db.ts`) + `recordSchemas.ts` settings (2000 to 2100). No UI yet.
- **Backup:** `npm run backup:firestore` (`scripts/backup-firestore.ts`) dumps `lessons` + the syllabus-fix collections to `backups/` (git-ignored). Not run yet (each doc = 1 read of the 50k/day).

## 8. Backing up for free

- Syllabus: it is in git. Tag before applying changes (`git tag pre-syllabus-fix`).
- Firestore: managed export needs the paid Blaze plan, so instead write a small Admin SDK script (`scripts/backup-firestore.ts`, Phase 1) that dumps `lessons` and the new collections to a local JSON file (not committed). User data: each student's device copy + the existing in-app backup (`src/lib/storage/backup.ts`).

## 9. Plan for Phases 1 to 8 (adjusted)

- **Phase 1:** extend `SubjectSchema` with optional fields: on subjects `courseCode` (reuse `code`), `status`, `source`, `confidence`, `batchYears`, `verifiedByCount`, `sameAs` (main copy of a duplicated course), `movedTo`; on chapters/topics `status`, `source`, `confidence`, `movedFrom`. Order stays array position (an explicit `order` is written when rearranging). Script sets current data to `official_site` / `unverified`. `syllabus_history` = `data/university/pdeu/history.jsonl` for admin changes plus Firestore `syllabusHistory` for live changes. Stale lessons: Firestore/JSON `staleTopics` map (`subject/topic` → changed-at time); a library or saved lesson older than that is regenerated on open (no bulk writes). Add `batchYear` to `AppSettings`. Firestore backup script. Rules stay deny-by-default.
- **Phase 2:** `scripts/split-handouts.mjs` (pdfjs-dist + pdf-lib), stop for counts; `scripts/import-handouts.mjs` reusing `src/lib/university/parse.ts` logic; matcher reusing `nameSimilarity`; dry-run report; then apply by editing `pdeu-*.json` and `src/data/pdeu/*.json`, logging to `history.jsonl`; ID integrity check script. ELEC/CHEM depend on the owner's decision.
- **Phase 3:** reuse `src/lib/extract` + `university/parse.ts` on a course page upload; preview; confirm sends proposals to a new server route.
- **Phase 4:** flag menus (course/chapter/topic/lesson) + "My subject isn't here"; server route writes Firestore `syllabusFlags`, `lessonFlags`.
- **Phase 5:** proposals in Firestore (`syllabusProposals`, votes subcollection), config in `src/lib/syllabusFix/config.ts`; applied proposals go into a Firestore `syllabusOverlay` that the app merges over the JSON. Lesson versions by adding a version to the library key.
- **Phase 6:** `/admin` page + `ADMIN_UID` env, checked server-side; revert from history; rate limits.
- **Phase 7:** badges from `source`/`confidence`; stale-on-open regeneration; contributor count; search reads the merged tree.
- **Phase 8:** tests for both bugs, flag flows with fake accounts (Firestore emulator or test project), `docs/SYLLABUS_SYSTEM.md`.

Evals: out of scope. Existing eval results are based on the old syllabus and are **outdated**; redo them after this fix (owner will ask separately).

## Progress Log

- **Phase 0 (audit): done, 2026-10-25.** Created `PRISM_SYLLABUS_FIX.md` (the plan, word for word) and this file. No code or data changed. Findings: syllabus is static JSON (no DB); ICT has no AI course; ME data is from an old scheme; 17 duplicated course codes; no batch year in profiles; ELEC and CHEM have handouts but no Prism branch; handout PDFs are already public on GitHub. Database changes: none.
  - Decisions: handout PDFs untracked + `.gitignore` gets `handouts/**/*.pdf` and `handouts/_split/**/*.pdf` (option a, history not rewritten). Electrical (`elec`) and Chemical (`chem`) will be added as new branches in Phase 2 (need entries in `src/data/branches.json`, `PDEU_BRANCH_IDS`, `src/data/pdeu/`).
  - Committed and pushed as `Syllabus fix: Phase 0, audit`.
  - **Next step:** Phase 1.
- **Phase 1 (tree data model): done, 2026-10-25.** See §2 (tree fields) and §7b (building blocks).
  - New: `src/lib/syllabusFix/{tree,history,stale}.ts` + tests, `src/data/syllabus/stale-topics.json`, `scripts/syllabus-migrations/001-tree-fields.ts`, `scripts/backup-firestore.ts`, `data/university/pdeu/history.jsonl` (1 entry: migration 001 up).
  - Changed: `src/lib/subjects.ts` (schema fields, retired hidden, `sameAs`/`movedTo` checks), `subjects.test.ts`, `src/lib/catalogue.ts`, `scripts/build-subject-light.mjs`, `src/lib/library/{sharedLibrary,adminStore}.ts` + test, `src/lib/storage/{db,recordSchemas}.ts`, `scripts/build-pdeu-layer.mjs` (guard), `package.json` (`backup:firestore`), `.gitignore` (`/backups/`), 301 `pdeu-*.json` (4 fields each).
  - Database changes: none in Firestore. Data: additive fields only; migration 001 is reversible (`down` tested: byte-identical files).
  - Checks: `npm run check` 764/766 in the full run (2 timeouts in `src/app/api/lesson/route.test.ts` under load; that file passes 5/5 alone), `npm run build` passes.
  - **Next step:** Phase 2 (split handouts, import dry-run report, stop for the owner's approval). Read §2, §3 (ID lock note), §6 and §7b first.
