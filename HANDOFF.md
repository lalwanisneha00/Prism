# HANDOFF: how to continue Prism exactly according to plan

Written for a new AI (or person) picking this repo up cold. Read this first, then `CLAUDE.md`, `AGENTS.md`, `SPEC.md`, `PROGRESS.md`, `MORNING_REPORT.md`, `DEPLOY_CHECKLIST.md` and `docs/PRISM_OVERNIGHT_FINAL.md` (the owner's original overnight brief). Last updated 2026-10-06 (after the semester, university-syllabus and slide-quality work).

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

## 4. The owner's latest requests (2026-10-06): all three are BUILT, pushed and tested; waiting for the owner's review

### 4.1 Slides and PDF quality: done

- No slide numbers in the PowerPoint (a PDF keeps page numbers). No line ends with an ellipsis: `clip()` in `src/lib/slides/text.ts` cuts at whole sentences, and long content is split over "(continued)" slides, never cut.
- Depth: every sentence of each section, agenda slide, prerequisites, key terms (glossary), all analogies, worked examples (continued on a second slide), misconceptions, "Keep learning", richer speaker notes. Class activities are now "Think, pair, share" on the lesson's hardest question (5–8 min, with three "how to work on it" hints) and "True or false? Defend it" from a real misconception (4 min). Source lessons are made longer (`lessonMinutesFor`: about slides × 2.4 min per topic).
- Tests: `src/lib/slides/*.test.ts`, `e2e/slides.spec.ts`. Decks were opened in PowerPoint and checked by eye.
- Known: a deck's length is still capped by the asked slide count (optional slides are dropped first); interactive widgets still show their slider controls in pictures.

### 4.2 Subjects by semester and non-core subjects: done

Student picks their semester and ticks the subjects their college teaches (any subject can sit in any semester), plus non-core subjects (Indian Knowledge System, Organisational Behaviour, Environmental Science …). Built-in non-core ones tick directly; others open the own-subject form with `?semester=N` and join that semester on save. Chosen subjects come first in the lesson maker. Code: `src/lib/semester/mySemester.ts`, `src/components/subjects/SemesterSubjects.tsx`, `useMySemester.ts`; settings field `mySubjects`. Tests: `mySemester.test.ts`, `e2e/semester-subjects.spec.ts`.
Bug found and fixed on the way: two quick settings saves could overwrite each other; `updateSettings` now queues writes (`settings.test.ts`).

### 4.3 University / college syllabus: done

`/subjects/university` ("Add my university syllabus", linked from the semester panel): upload (PDF, Word, slides, photo; read on the device) or paste; "Read my syllabus" (rule-based parser `src/lib/university/parse.ts`) or "Read it with AI" (`/api/syllabus`, Zod-checked, chunked; uses the student's key if set). Then a review screen: per semester, each university subject is matched to a built-in subject (`match.ts`: name similarity ignoring filler words like "Engineering"/"Applied"/"I", plus topic overlap), or kept as the student's own subject, or skipped; chapters the university does not teach are unticked and can be ticked back. Apply (`apply.ts`) saves `mySubjects` per semester, `universityScope` (subject → chapter → topic ids), creates own subjects for what Prism does not teach. The scope is enforced in the lesson picker, subject pages and the planner via `useScopedSubjects` (`src/components/university/`); a notice offers "Show everything" / "Edit my syllabus"; "Remove it" clears it. Fixture: `test-fixtures/university-syllabus-sample.txt`. Tests: `src/lib/university/*.test.ts`, `e2e/university.spec.ts`.
Not yet scoped: the concept map page and chapter-lesson pages that load a subject directly by id (they still show every chapter). Matching is word-based, so a differently worded syllabus may leave chapters in; the review screen is where the student corrects that.

### 4.4 What is next (only when the owner says)

1. The owner reviews the preview and the three items above and gives feedback.
2. Re-run the full four-mode browser regression once (it has not finished since the redesign: 58 passed, `chapter-reading` desktop-dark needs a solo re-run).
3. Evals (paused by the owner), Feature D (community branches), Lighthouse/bundle checks, concept-map scoping.

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

## Latest round (My subjects / syllabus personalisation)

New code: `src/lib/syllabus/*` (types, propose, coverage, store, emphasis), `src/lib/university/parse.ts` (page-aware), `src/components/subjects/SubjectsHub.tsx`, `SyllabusUpload.tsx`, `src/components/map/MapSubjectPicker.tsx`. Real fixture: PDEU CE Sem 1 (`test-fixtures/pdeu-*`). Read CHANGES.md and PERF_REPORT.md. Waiting for user feedback; do not start Feature D.
