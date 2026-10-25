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

| Folder  | Prism branch id | Status                                                                                                                      |
| ------- | --------------- | --------------------------------------------------------------------------------------------------------------------------- |
| COMP    | `ce`            | 8 PDFs                                                                                                                      |
| ICT     | `ict`           | 8 PDFs                                                                                                                      |
| ECE     | `ece`           | 8 PDFs                                                                                                                      |
| MECH    | `me`            | 8 PDFs                                                                                                                      |
| CIVIL   | `civil`         | 8 PDFs                                                                                                                      |
| PETRO   | `petro`         | 8 PDFs                                                                                                                      |
| BIOTECH | `biotech`       | 8 PDFs                                                                                                                      |
| ELEC    | `elec` (added)  | 8 PDFs. Added in Phase 2 (`branches.json`); no handbook file, uses the 2020 `20EE` scheme; sem 2 has no course (known gap). |
| CHEM    | `chem` (added)  | 8 PDFs. Added in Phase 2 (`branches.json`); no handbook file.                                                               |
| CSBS    | **none**        | Folders empty. Skipped (plan says so).                                                                                      |
| CSSE    | **none**        | Folder deleted by the owner on 2026-10-25. Skipped.                                                                         |

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

## 7c. Phase 2 building blocks (use these in later phases)

- **Handout pipeline:** `npm run handouts:split` → `handouts:import` → `handouts:match` (dry run: `handouts/_parsed/REARRANGE_REPORT.md`, `rearrange-plan.json`). Logic in `src/lib/syllabusFix/handoutCourse.ts` (units, experiments, course type, `tidyCaps`), `handoutOutline.ts` (course tables), `handoutMatch.ts` (matcher). Phase 3 reuses these on a student's upload (port `scripts/lib/handout-text.mjs` `detectCourseStarts` into `src/lib` first; it is Node-only today).
- **Applied as migration `scripts/syllabus-migrations/002-handout-rearrange.ts` up|down.** `up` tags `pre-syllabus-phase2-apply`, records every written file in `data/university/pdeu/migrations/002-handout-rearrange.json` (+ items not applied); `down` restores those files from the tag and deletes the 253 created subject files (tested twice). Run `npx prettier --write` on the data afterwards, then `node scripts/build-subject-index.mjs` and `build-subject-light.mjs`.
- **New schema fields:** subject `courseType` (`theory|practice|practical`, missing = theory), `relatedCourses` (theory course ↔ its lab); topic `number`, `aim` (lab experiments; a lab has one chapter `experiments`). Handbook course `retired`, `source: handout`. Flag `FLAGS.practicalCourses` (env `NEXT_PUBLIC_FLAG_PRACTICAL_COURSES`, default off) hides labs from `subjects`, `subjectIndex` and so from every list until Phase 7B.
- **`subjectsFor(branch, sem)` now uses the branch's own offering semester** (a shared course in CE sem 2 and ICT sem 3 no longer shows in CE sem 3). `nameSimilarity` (`src/lib/university/match.ts`) now returns 0 for different numbers of one series (Mathematics I vs III); student uploads benefit too.
- **ID integrity:** `npm run syllabus:check` (`scripts/check-syllabus-ids.ts`): every locked id resolves (moved topics through `movedFrom`), subject-map / offerings / related / stale links valid. The lock test in `subjects.test.ts` accepts moved topics the same way.

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
- **Phase 2 (import + rearrange): done, 2026-10-25.** See §6, §7c.
  - Steps 0-2 (split 72 PDFs → 624 pieces; import; dry run): course types 399 theory, 2 practice, 189 practical, 34 not taught, 0 undetected (no handout prints a type: title + L-T-P + units/experiments, checked against the T/P code letter). Owner spot-checked 4 count cells; "Project Management" and 0-0-P field work fixed. Committed `Syllabus fix: Phase 2 step 0, split handouts`.
  - Owner's decisions (2026-10-25): (1) Introduction to AI added as its own course for ICT sem 3 and ECE sem 3 (`pdeu-introduction-to-artificial-intelligence-ict`/`-ece`), topics copied from `...-department-ce` as a draft, `official_site`/`unverified` (upload banner applies in Phase 3). (2) The 15 same-name-different-syllabus courses (ICT ML, IoT, Blockchain, CHEM Maths III, ...) got their own per-branch course. (3) Matcher approved, plus: generic words (introduction, basics, overview, applications, fundamentals) ignored; weak matches (name 0.4-0.85 without topic support) → needs_review; an old topic holding several handout topics is split, first piece keeps the id. Electives: middle code digit ≥3 (24ME431T); new ones go into a slot (one per semester when the handbook has none: ME sem 7 really picks 3, review in Phase 6).
  - Applied (migration 002 up): 27 links to branch/semester, 6 semester moves, 58 + 15 + 2 new theory courses, 178 new labs (4 had no experiment list), 22 missing units, 13 reorders, 18 placeholder chapter names renamed, 80 topic moves (`movedFrom` kept), 482 missing topics, 1,279 topic splits (+2,566 topics; 835 one-word pieces like "digital"), 380 retirements (soft), ME's old handbook courses retired. 253 subject files created, 284 files changed, 6,124 history entries, 1,349 topics stale, lock 12,274 → 21,324 ids. Every changed node is `admin_handout`/`verified`. New topics need the topic before them (concept map convention).
  - Not applied (in the migration manifest): 7 existing courses the handout calls labs (Engineering Graphics x4, CIVIL lab-named courses) stay listed as theory, decide in Phase 7B; 4 labs with no experiment list. needs_review: 174 (37 unsure matches, several only singular/plural: "Dynamics of Machines" vs "...Machine", "Microwave and Antennas" vs "Antenna"; 93 course-table rows without a handout page; 20 parsing/type; 9 incomplete handouts; 15 decided). Phase 6 admin queue should take these.
  - Checks: `npm run syllabus:check` OK (21,324 locked ids resolve, no record points at a missing id), `npm run check` 802/802, `npm run build` passes. Light index 44 KB → 62 KB gzipped (hidden labs included).
  - Database changes: none in Firestore. Bugs: ICT sem 3 lists 6 courses incl. AI; ME spring topics left Design of Shafts (tests in `pdeuCatalogue.test.ts`).
  - Committed and pushed as `Syllabus fix: Phase 2, import handouts and rearrange the syllabus` (992653f) with tag `pre-syllabus-phase2-apply`.
- **Phase 2 follow-up (owner's requests after 992653f): done, 2026-10-25.** Migration 002 was run `down` and `up --keep-ids-from=992653f` with these changes (numbers above are superseded by these):
  - Stricter split (`standsAlone`, `mergeFragments`, `TECH_TERMS` in `handoutCourse.ts`, applied to every handout topic list): a piece stands alone with 2+ meaningful words, a known technical term or an acronym; otherwise it stays joined to its phrase. A split also needs every piece inside the old topic and the pieces to carry 80% of its words (`SPLIT_COVERAGE`). Splits 1,279 → 976, new topics 2,567 → 1,733, one-word pieces 835 → 107 (mostly acronyms/terms: FTIR, CMOS, ELISA). Two-letter acronyms (MR, CT) are no longer dropped.
  - Plural-aware matching (`singular()` in `src/lib/university/match.ts`, also used by topic matching). Weak matches need evidence (name ≥ 0.6 or topics ≥ 0.2, `WEAK`); one shared word with no shared topics = new course. Decision 2 now a rule: another branch's same-named course with a different syllabus (loose overlap < 50%, or < 30% shared topics without a code match) = own course. Generic-only topics ("Introduction") compare by plain words.
  - ME sem 3 now: Engineering Mechanics, Introduction to AI in Mechanical Engineering (own course), Maths III, Metrology, Thermodynamics.
  - The 4 labs without experiment lists are courses with no chapters, `unverified` (catalogue allows an empty practical course).
  - Multi-pick electives: handbook slot `picks` (ME sem 7: 3, from the course table's 3 "Professional Elective" rows); extra choices saved as `<branch>/<slot>#2`, `#3` (`pickId`, `choicesFor` in `src/lib/pdeu/electives.ts`; old one-pick choices unchanged); `PdeuSemester` shows one dropdown per pick. An elective printed as compulsory in the old handbook moves into the slot. ME sem 7 slot: 9 options (24ME438T CAM is an unsure match).
  - Published ids kept: `keepPublished` restores every id of the 992653f lock that the new run no longer has (retired topic/chapter, or `formerChapters` on a topic that moved again; new topic field). 1,950 kept; lock 23,021 ids, all published ids included. Bug found and fixed before commit: it first treated the topic bank (em.json …) as missing courses.
  - Retired chapters and topics are now hidden in lists: `activeChapters` (`src/lib/syllabusFix/active.ts`) used by `chaptersOf` (subject page, lesson picker, topic search), concept map, prerequisite graph, catalogue search, planner, progress tracker, multi-chapter mock, and the light index counts. Lookups by id still find them.
  - Result: 26 links, 6 semester moves, 100 new theory courses (+2 AI drafts), 182 new labs (4 empty), 19 missing units, 11 reorders, 17 renames, 68 topic moves, 404 missing topics, 976 splits, 485 retirements. 7,028 history entries (the 992653f entries are marked reverted), 1,042 topics stale. needs_review 174 → 127 (5 unsure matches, 93 course-table rows without a handout page, 20 parsing/type, 9 incomplete handouts).
  - Checks: `npm run syllabus:check` OK, `npm run check` 808/810 (the 2 failures are `src/app/api/lesson/route.test.ts` timeouts under load; 5/5 alone), `npm run build` passes.
  - Committed and pushed as `Syllabus fix: Phase 2 follow-up, stricter splits, plurals, multi-pick electives` (368b787).
- **ELEC first year (owner's decision, option B): done, 2026-10-25.** Migration `scripts/syllabus-migrations/003-elec-first-year.ts` up|down (tag `pre-syllabus-003`, manifest `data/university/pdeu/migrations/003-elec-first-year.json`; `down` restores the files from the tag).
  - ELEC sem 1 and 2 = the 2024 common first year shared by CSE/ICT/EC/EE: the 21 courses ECE has there (same offering keys, labs included), minus ECE's two course-table-only twins (`pdeu-environment-science-ce-ece`, `pdeu-introduction-to-electrical-engineering`). ELEC's 2020-scheme sem 1 course and lab retired (soft).
  - All 63 ELEC courses from sem 3 on are ELEC-only and from the 2020-scheme handouts: course, chapters and topics now `unverified` (62 changed; the empty EV lab already was), so the Phase 3 upload banner and Phase 4/5 flags can correct them. 85 history entries.
  - Checks: `npm run syllabus:check` OK, `npm run check` 811/811, `npm run build` passes. Test `pdeuCatalogue.test.ts` covers ELEC; no known gaps left.
  - Committed and pushed as `Syllabus fix: ELEC first year from the 2024 common first year` (2bbe591), tag `pre-syllabus-003`.
- **Course-table-only twins (owner's decision): done, 2026-10-25.** Migration `scripts/syllabus-migrations/004-unlink-table-twins.ts` up|down (tag `pre-syllabus-004`). Where a branch listed two copies of one course (one matched by its 2024 handout, one kept only because the old course table names it), the table-only copy is unlinked from that branch: ECE s1 Environment Science (CE, ECE), ECE s2 and CIVIL s2 Introduction to Electrical Engineering, ECE s6 Computer and Communication Networks, CIVIL s1 Environment Science (Civil), ME s1 Engineering Graphics (Mech). Also ME's old-scheme first-year leftovers whose handbook entries Phase 2 had already retired but which My subjects still listed: Environmental Studies, Communication Skills (Theory), Professional Ethics and Human Values. A course with another branch only loses that offering; one with no other branch is retired; the branch's handbook entry is marked retired. 14 history entries. New test: no listed course points at a retired handbook entry; ECE s1 has one Environmental Science.
  - Checks: `npm run syllabus:check` OK, `npm run check` 811/812 (the lesson-route timeout under load; 5/5 alone), `npm run build` passes.
  - **Phase 2 is complete.** Migrations applied in order: 001, 002, 003, 004 (each has `down`; tags `pre-syllabus-phase2-apply`, `pre-syllabus-003`, `pre-syllabus-004`).
  - **Next step:** Phase 3 (student handout upload). Read §7b and §7c first. Reuse `src/lib/syllabusFix/handoutCourse.ts` / `handoutMatch.ts` (and port `detectCourseStarts` from `scripts/lib/handout-text.mjs` into `src/lib`). The banner shows on any course whose confidence is not `verified` (ICT/ECE AI drafts, all ELEC from sem 3, the 4 empty labs, untouched old data). Open lists for Phase 6: 127 needs_review items in `handouts/_parsed/rearrange-plan.json`; the 7 lab-as-theory courses wait for Phase 7B.
