# HANDOFF: how to continue Prism exactly according to plan

Written for a new AI (or person) picking this repo up cold. Read this first, then `CLAUDE.md`, `AGENTS.md`, `SPEC.md`, `PROGRESS.md`, `MORNING_REPORT.md`, `DEPLOY_CHECKLIST.md` and `docs/PRISM_OVERNIGHT_FINAL.md` (the owner's original overnight brief). Last updated 2026-10-06.

## 1. What Prism is

A free, visual, sourced study guide for engineering students (Next.js 16, React 19, Tailwind 4, TypeScript strict, Zod, Firebase Spark free plan, Vercel). Pick subject → chapter → topic, level (six) and length; get an AI lesson that is grounded in fetched sources, fact-checked, code-checked, with visuals the AI can only choose from a trusted registry. 84 subjects, golden-set accuracy evals, planner, flashcards, mock tests, uploads, audio, accounts and sync. The owner is **Sneha** (a first-year student; explain simply). Never use gendered pronouns for anyone unless stated.

## 2. Where everything is

- Repo: github.com (origin) branch **`overnight-v3-final`**. `main` is production: **never merge into `main` or touch production/live Firebase without the owner saying so.**
- Tags (all pushed): `before-overnight-final`, `v3-step-11`, `final-feature-a`, `final-feature-b`, `final-feature-c`, `final-polish`. Earlier tags: `v2.5-step-N`, `v3-step-2…7`, `concept-map-fix`.
- Rules for working here: `CLAUDE.md` (build one step at a time, `npm run check` + `npm run build` before handover, no `any`, Zod-validate all AI output, every screen has loading/empty/error/rate-limit states, 375px mobile, data not hard-coded logic, pure logic in `src/lib` with a Vitest test next to it, Prettier).
- Feature flags: `src/lib/flags.ts` (env `NEXT_PUBLIC_FLAG_BYO_KEY`, `_SLIDES_PDF`, `_REDESIGN`, `_COMMUNITY`).
- Owner's standing preferences: build autonomously step by step without asking; test yourself; commit and push often; keep `PROGRESS.md` "Current state" and `MORNING_REPORT.md` up to date; "✅ Check this" notes for the owner; nothing paid (no Cloud Functions, no Firebase Storage); no secrets in git; storage changes need migrations; automated tests use mocked/fake AI (`LLM_PROVIDER=fake`), live AI only in the eval.

## 3. State of the work (2026-10-06)

| Area                                        | State                                                                                                                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V2, V2.5, V3 Steps 2–7                      | Done, tagged.                                                                                                                                                             |
| V3 Step 11 (time recommendations + planner) | Done (`v3-step-11`).                                                                                                                                                      |
| V3 Step 12 (own-syllabus matching)          | `src/lib/custom/matchSyllabus.ts` done and tested; the **university-syllabus feature below is the real Step 12 and is NOT finished.**                                     |
| V3 Steps 8–10 accuracy evals                | **PAUSED by the owner.** The app shows "Test not run yet" (`src/lib/evalStatus.ts`, `src/data/evalStatus.json`). Do not restart evals until the owner says so.            |
| Feature A (own API key)                     | Done (`final-feature-a`).                                                                                                                                                 |
| Feature B (slides + PDF)                    | Done and tagged, **now being improved** (see §4).                                                                                                                         |
| Feature C (redesign)                        | Done (`final-feature-c`); Classic look kept behind the footer switch.                                                                                                     |
| Feature D (community branches)              | **Not started** by decision; spec in `docs/PRISM_OVERNIGHT_FINAL.md` §7. Flag `community` stays off. Needs the owner's go-ahead and Firestore rules applied by the owner. |
| DB-lock fix                                 | Done (`e2b8aca`): older tabs holding IndexedDB open used to freeze pages; now they step aside and a notice shows.                                                         |
| Last full browser regression                | Not completed (stopped on request). 58 tests passed; `chapter-reading` desktop-dark failed once during a system sleep and has not been re-run alone.                      |

## 4. THE CURRENT TASK LIST (from the owner, 2026-10-06). Do these in order; each is a separate commit

### 4.1 Slides and PDF quality (in progress)

The owner's complaints about generated decks/PDFs and what was decided:

1. **Content was too basic** (e.g. an activity "discuss the SI unit of charge", 3 minutes). Required: decks must be as good as the web lessons. Done so far in `src/lib/slides/build.ts` (`lessonCandidates`, `activitySlides`, `chunkPoints`, `hardestQuestion`): every sentence of a section kept and split over slides (not cut), agenda slide, prerequisites, glossary "Key terms" slides, "Keep learning" slide, all analogies/examples/misconceptions chunked, worked examples continue on a second slide, richer speaker notes, and the class activity is now "Think, pair, share" on the lesson's hardest quiz question (5–8 min, with three working hints) plus a "True or false? Defend it" task from a real misconception (4 min).
2. **Remove slide numbers from the PowerPoint** (editing slides would force renumbering). TODO: delete the `label` text box in `decorate()` in `src/lib/slides/pptx.ts` (the "n / total" and blueprint "FIG. NN"). PDF page numbers stay (a PDF is not edited).
3. **No incomplete lines ending in "…".** Done: `clip()` in `src/lib/slides/text.ts` now cuts at a whole sentence/clause/word and never adds an ellipsis; schema limits in `src/lib/slides/plan.ts` raised about 2.2×; `build.ts` has a wrapper `clip` with generous body limits. TODO: confirm no "…" appears anywhere in generated output (add a test that scans every slide string for "…" except the glossary/maths).
4. **TODO (needed to finish 1):** the `activity` slide now has `hints: string[]` (schema + builder). Render it in `pptx.ts` (`case "activity"`: prompt card left/top, "How to work on it" numbered hints below or beside, minutes label) and `pdf.ts` (`case "activity"`), update `overflowRisks()` and the tests (`build.test.ts` expects an activity and a recap; `pptx.test.ts`/`pdf.test.ts` must still pass; add a test that activity minutes are 4–8 and hints exist). Update `lessonMinutesFor()` in `src/lib/slides/generate.ts` so the source lessons are richer (about `slides × 2.4` minutes per topic, capped at 60).
5. After the changes: rebuild, generate each purpose in PowerPoint and PDF, open the .pptx in PowerPoint (COM `Presentations.Open` + `Export` to PNG works on the owner's machine, see §6) and look at the slides; fix overflow.

### 4.2 Subjects by semester and non-core subjects (in progress, code written, untested in browser)

Colleges teach the same subject in different semesters, so the student picks. Built:

- Settings field `mySubjects: Record<"1".."8", string[]>` (`src/lib/storage/db.ts`, `recordSchemas.ts`, `progress.ts`).
- Pure helpers + test: `src/lib/semester/mySemester.ts` (`withPick`, `picksFor`, `usuallyInSemester`, `NON_CORE`, `addSubjectToSemester`).
- Hook `src/components/subjects/useMySemester.ts`; UI `src/components/subjects/SemesterSubjects.tsx` (semester selector, chosen list, searchable checklist grouped by field, "usually taught this semester" hints, non-core list: built-in ones tick directly, others open `/my-subjects/new?name=…&semester=N` and the new own-subject joins that semester when saved).
- Wired into `SubjectCatalogue.tsx` (top of `/subjects`) and `LessonPicker.tsx` (chosen subjects come first; falls back to branch/semester). `CustomSubjectForm` accepts `addToSemester`.
- TODO: run `npm run check`; write an e2e test (`e2e/semester-subjects.spec.ts`: choose semester 2, tick two subjects, see them first in the picker, add a non-core subject via the form, reload and check they persist); view it at desktop and 375px, light and dark; handle the Classic look.

### 4.3 University / college syllabus upload that customises subjects and chapters (NOT started; design agreed)

The owner wants to add their official college or university syllabus for their branch; Prism analyses it and customises the **subjects, and the chapters/topics inside each subject**, to what that university actually teaches (some universities skip subjects or chapters). Plan:

1. `src/lib/university/parse.ts` (pure, tested): turn pasted/extracted syllabus text into `{ semesters: [{ number, subjects: [{ name, code?, units: [{ name, topics[] }] }] }] }`. Heuristics: lines like "Semester III / SEM-3 / Third Semester" switch semester; course headings ("BT101 Engineering Biology", "Course Title: …"); units via the existing `parseSyllabusText` in `src/lib/custom/syllabusText.ts`. Fixtures in `test-fixtures/`.
2. Optional AI structuring for messy PDFs: `/api/syllabus` route (use `chainFor(req, providersFromEnv)`, validate with Zod, chunk long text, `LLM_PROVIDER=fake` canned reply for tests), client tries the deterministic parser first.
3. `src/lib/university/match.ts` (pure, tested): match each parsed subject to a catalogue subject (name word overlap + `sameTopic` coverage from `matchSyllabus.ts`), and compute per-subject **scope**: which catalogue chapters/topics the university syllabus covers (a topic is kept if it matches a university topic or unit name; apply only when the university lists at least 4 topics for that subject; keep all otherwise). Unmatched university subjects become the student's own subjects (`chaptersFromDraft`, `createCustomSubject`).
4. Review screen (before anything is applied): per semester a table of detected subjects with match status (built-in X / new own subject / skip), "covers 5 of 7 chapters", toggles per subject/chapter/topic. Apply = save `mySubjects` per semester + `subjectScope` in settings (new field; migration-free optional field; sync like other settings), with "Show everything again" to undo.
5. Enforce scope everywhere subjects are listed: a pure `applyScope(subject, scope)` plus a hook; use it in the lesson picker's subject list, `SubjectProgress` (subject page chapters), the planner (`PlanSetup` topics), concept map and chapter lessons. Show a small notice "Your university syllabus is applied (N topics hidden)".
6. Files: reuse `extractFile` / `docText` (`src/lib/extract/*`) as `CustomSubjectForm` does. Everything stays on the device except structure saved in synced settings; never upload the file.
7. Tests: unit (parse, match, scope), e2e with a fixture syllabus, 375px check.

### 4.4 After 4.1–4.3

Update `MORNING_REPORT.md` and `PROGRESS.md`, push, tag (`final-semester-syllabus`), and wait for the owner. Then, only if told: re-enable evals (command in `PROGRESS.md`), Feature D, remaining polish.

## 5. How to run and verify

```bash
npm install
npm run dev                 # http://localhost:3000 (if the owner's other project "Register" served a service worker there, use `npx next dev -p 3100`)
npm run check               # typecheck + lint + prettier --check + all Vitest tests (686 pass at last run)
LLM_PROVIDER=fake npx next build
E2E_SERVER=start npx playwright test --project=desktop-light      # production build + fake AI; add --project=mobile-dark etc.
```

Playwright uses Edge (`channel: msedge`), one worker, port 3210. If a run is killed, a stray server can keep port 3210: `netstat -ano | grep :3210` then `taskkill //PID <pid> //F`. Run heavy commands one at a time (the computer has little free memory; `NODE_OPTIONS=--max-old-space-size=3072`). The computer sometimes sleeps: a test that "took hours" and failed usually passes when re-run alone.

## 6. Environment quirks (learned the hard way)

- Windows 11 with Git Bash. **Heredocs mangle backslashes and `\f \o \v \b` in strings**: write any file containing backslashes (LaTeX, regexes, `\n`) with the editor/Write tool, never `cat <<EOF`. After scripted edits grep for broken regexes.
- `src/lib/subjects.ts` is a file; do not create a `src/lib/subjects/` folder (use `src/lib/semester/`).
- PowerPoint is installed: `New-Object -ComObject PowerPoint.Application`, `Presentations.Open(path,$true,$false,$false)`, `.Export(outDir,"PNG",1280,720)` renders decks to images for visual QA. PDFs: render pages with pdfjs-dist in a Playwright page (see how it was done: small local http server serving `node_modules/pdfjs-dist` and the file; `getDocument({url})`).
- PDF fonts are embedded whole (`subset:false`) because pdf-lib subsetting dropped glyphs for Noto fonts; fonts live in `public/fonts`.
- `/dev/*` pages 404 on the live site (`src/app/dev/guard.ts`); the fake-AI test server serves them.
- Do not run two `next dev` servers in one folder. Stop servers and browsers after tests.
- E2E selectors: avoid `getByText("First Encounter")` clashes (the home hero legend is aria-hidden CSS text on purpose).
- `.logs/` is git-ignored scratch for background runs.

## 7. Open items and honest caveats

- Interactive widgets in slide pictures still show their slider controls.
- Lighthouse and bundle size were never measured. Heavy libraries (pptxgenjs, pdf-lib, html-to-image, mermaid) are lazy-loaded.
- Live providers (Gemini, OpenAI, Anthropic …) were never called by tests (mocks only); the first real use of the own-key feature should be checked by the owner.
- E&M (79.8%) and Engineering Maths (88.5%) last measured scores are below the 95% release gate; shown as "Sourced".
- Needs the owner (cannot be done by an AI): review the Vercel preview, add authorised domains in Firebase Auth, say when to run evals / start Feature D, apply any future Firestore rules.

## 8. If you are resuming and unsure

Read `PROGRESS.md` "Current state", run `git status` and `git log -5`, run `npm run check`, read §4 above, continue the first unfinished item, commit after each unit of work, push, and update `PROGRESS.md`. Never restart a finished step; never merge to `main`; never ask the owner a question you can answer from these files.
