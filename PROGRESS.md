# Progress

Update this after every step so any person or AI tool can pick up the work.

## Current state (resume here)

- **Mode:** AUTONOMOUS (user, 2026-10-04: "keep going step after step without confirmation… run tests on your own and move to the next step") on branch `overnight-v2.5-v3`. Status for the user goes in `MORNING_REPORT.md`.
- **Version / step:** V3 · Step 8 (Wave 2: CE, IT, ICT, ECE: 21 subjects; syllabus, grounding, widgets, golden sets, eval): not started.
- **Finished:** all of V2.5; concept map fix (tag `concept-map-fix`); V3 · Steps 2–7 (tags `v3-step-2` … `v3-step-7`). Wave 1: 7 subjects `verified`, Engineering Graphics `tested`.
- **Half-done:** none.
- **Next action:** Step 8. Sources: AICTE CSE model curriculum (IIIT Delhi copy of AICTE2018-CSE-Curriculum.pdf: DSA, Discrete Maths, COA, OS, DAA, DBMS, Automata, OOP, Compilers, Networks), the ECE model curriculum (aicte-ece.txt), and an AICTE-model university syllabus for Software Engineering, Web Technologies and AI/ML (e.g. AKTU). Then Steps 9–11, then a full polish pass (user, 2026-10-04: "keep going till you finish v3 entirely then also polish all the work"). Polish list so far: accuracy table cramped at 375px (use cards); the "Sourced" tier text says the test isn't finished, wrong for E&M and Engineering Maths (measured, facts not quoted yet).
- **Eval on this computer:** run one subject at a time in the foreground (`npm run eval -- --subject=<id>`); a long background run was once stopped by the system for low memory.
- **Running commands:** none.
- **Open from V2:** release gate not passed (best runs: em 83.2%, engg-math 88.5%; both shown as "sourced"). Re-run `npm run eval` when quota allows.
- **Resume protocol (SPEC §12.7):** read PROGRESS.md and SPEC.md, `git status`, `git log -5`, check the build, continue from "Next action". Finish half-done work first; never restart a finished step.

### Overnight autonomous run rules (2026-10-04)

1. Finish V2.5 in order, then V3 in order (Other subjects after navigation; structure, navigation, accuracy scaffolding and Other subjects before the syllabus waves; Wave 1 completely first).
2. Never ask or wait. Unclear → most sensible option that fits SPEC.md, noted in MORNING_REPORT.md.
3. After each step: build, lint, typecheck, Vitest (with new tests), Playwright headless checks of the main flow at desktop and 375px in light and dark; parser/generator fixtures in `test-fixtures/`. Fix failures; after three real attempts, revert the broken part, record it and move on.
4. "✅ Check this" blocks go into MORNING_REPORT.md. Anything needing the user → "Needs Sneha".
5. Branch `overnight-v2.5-v3` only (never main, never production). Commit and tag every finished step (`v2.5-step-N`, `v3-step-N`); push the branch for a Vercel preview. No destructive git, no secrets, no live Firestore rule or data changes (proposed rules go in a file), nothing paid, storage changes migrate without data loss.
6. Tests use mocked AI and fixtures; live Gemini only for the eval, rate-limited, cached and resumable. Regression eval for E&M and Engineering Maths when quota allows.
7. Usage limit: wait and resume. Network loss: retry with increasing waits, then keep working offline and push later.

## Version 1: Foundation

| Step | Title                  | Status  | Date       | Notes                                                                                                                                                        |
| ---- | ---------------------- | ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | Project setup          | ✅ Done | 2026-10-02 | Next 16.3, Tailwind 4, ESLint 9 + Prettier, Vitest 5. Pushed to GitHub.                                                                                      |
| 2    | Design system & layout | ✅ Done | 2026-10-02 | Tokens in globals.css, data-theme dark mode, header, hero, footer.                                                                                           |
| 3    | Topic picker           | ✅ Done | 2026-10-02 | em.json (7 chapters, 43 topics), levels + durations config, /lesson summary page.                                                                            |
| 4    | Lesson schema + search | ✅ Done | 2026-10-02 | schema.ts (Zod + cross-checks), Gauss sample lesson, topic search box (user request)                                                                         |
| 5    | Lesson page renderer   | ✅ Done | 2026-10-02 | Level-specific layouts (levelLayouts.ts), KaTeX, step-by-step examples, quiz.                                                                                |
| 6    | AI integration         | ✅ Done | 2026-10-02 | /api/lesson NDJSON stream, Gemini→Groq chain, per-level prompts, Zod + repair retries, LLM_PROVIDER=fake for testing.                                        |
| 7    | Sources & grounding    | ✅ Done | 2026-10-02 | em-sources.json (all 43 topics, links verified), Wikipedia excerpts, KaTeX check, AI fact-check pass, Sourced/Verify badges.                                 |
| 8    | Visual library part 1  | ✅ Done | 2026-10-02 | 8 widgets (src/visuals), physics.ts tested, 11 PhET sims, safe plot parser, Mermaid (strict), Commons images, /dev/visuals gallery.                          |
| 9    | Audio (read-aloud)     | ✅ Done | 2026-10-02 | /api/audio writes chapter-by-chapter narration (140 wpm); Web Speech player with ±15s, speed, voice, chapters, highlight, resume.                            |
| 10   | Save, polish, deploy   | ✅ Done | 2026-10-02 | IndexedDB library + recent topics (sync-ready records), 404/error pages, "/" shortcut, 15-topic golden set + npm run eval. Deploy + real eval need the user. |

## Version 2: Personal & powerful

| Step | Title                                        | Status                                            |
| ---- | -------------------------------------------- | ------------------------------------------------- |
| 1    | Accounts, cloud sync & shared lesson library | ✅ Done                                           |
| 2    | All 6 levels                                 | ✅ Done                                           |
| 3    | Long audio                                   | ✅ Done                                           |
| 4    | PDF upload + retrieval                       | ✅ Done                                           |
| 5    | PYQ / worksheet mode                         | ✅ Done                                           |
| 6    | Engineering Mathematics + visuals part 2     | ✅ Done                                           |
| 7    | Interaction tools                            | ✅ Done                                           |
| 8    | Prerequisite concept map                     | ✅ Done                                           |
| 9    | Trust tiers & accuracy guards                | ✅ Done                                           |
| 10   | Generic visual toolkit part 1 + planner      | ✅ Done                                           |
| 11   | Flashcards + spaced repetition               | ✅ Done                                           |
| 12   | Highlights & comments                        | ✅ Done                                           |
| 13   | Backlog planner & progress tracker           | ✅ Done                                           |
| 14   | Export & eval (golden sets, accuracy page)   | ✅ Built (gate open: best runs em 83%, maths 89%) |

When V2 · Step 1 starts: give the user click-by-click Firebase console setup (Spark project, Google sign-in, Firestore database, web config, service account key, authorized domains).

## Version 2.5: Uploads in any format and whole-chapter lessons

Step protocol: "✅ Check this" block and the user's confirmation after each step (SPEC §11.5).

| Step | Title                                                                                   | Status  |
| ---- | --------------------------------------------------------------------------------------- | ------- |
| 1    | Multi-format parsers and the normalised extracted-text format                           | ✅ Done |
| 2    | Upload experience, preview, "My materials" page, OCR option                             | ✅ Done |
| 3    | Chapter and multi-topic selection, chapter load score, three time options               | ✅ Done |
| 4    | Chapter lesson composition, chunked generation and streaming, library reuse             | ✅ Done |
| 5    | Long-lesson reading, chapter audio, chapter extras + mock test, regression eval, deploy | ✅ Done |

## Version 3: All Engineering

Step protocol: one step at a time with a "✅ Check this" block in MORNING_REPORT.md; autonomous from Step 5 on (user, 2026-10-04). `wip:` commits inside a step; update "Current state" after each unit of work.

| Step | Title                                                                                              | Status         |
| ---- | -------------------------------------------------------------------------------------------------- | -------------- |
| 1    | Restructure the plan                                                                               | ✅ Done        |
| 2    | Subject data model and loader (branches, shared subjects)                                          | ✅ Done        |
| 3    | Navigation (branch → semester → subject …), search, mock tests                                     | ✅ Done        |
| 4    | Other subjects (custom non-core subjects, outline from material, theory-style lessons)             | ✅ Done        |
| 5    | Accuracy scaffolding (`tested` tier, sourced golden sets, resumable eval, numeric and code checks) | ✅ Done        |
| 6    | Wave 1 syllabus and grounding (incl. complete Applied Physics)                                     | ✅ Done        |
| 7    | Wave 1 visuals and widgets, Wave 1 eval                                                            | ✅ Done        |
| 8    | Wave 2 (CE/IT/ICT/ECE) syllabus, visuals, eval                                                     | ⬜ Not started |
| 9    | Wave 3 (Electrical, Mechanical, Civil)                                                             | ⬜ Not started |
| 10   | Wave 4 (Chemical, Petroleum, others at `sourced`)                                                  | ⬜ Not started |
| 11   | My-own-syllabus matching, regression eval, performance, accuracy page, deploy                      | ⬜ Not started |

Subjects per wave: Wave 1: 9 · Wave 2: 21 · Wave 3: 21 unique (Circuit Theory = Network Theory) · Wave 4: 12 tested candidates (Heat Transfer shared with Mechanical) + ~20 `sourced` subjects for other branches.

## Version Final: Universal (formerly V3)

The old V3 steps, unchanged except those pulled into V3 (syllabus upload, mock tests, computer-science and chemistry visuals, maps where needed). See SPEC §13. Not started.

## Plan changes

- **2026-10-04: Subject concept map fix** (SPEC §11.6) before V3 · Step 5: hover/focus/pin highlighting of all prerequisites with numbered study order, side panel, chapter bands with collapse, no redundant arrows, zoom/pan/fit/search, graph validation.

- **2026-10-04: "Other subjects"** (SPEC §12.8) added as V3 · Step 4 (later steps renumbered 5–11), and an overnight autonomous run on branch `overnight-v2.5-v3` (rules in "Current state").

- **2026-10-04: New V2.5** (SPEC §11.5), built before the rest of V3: uploads in any common format (PowerPoint, Word, Excel/CSV, text, images with OCR, OpenDocument; friendly message for old .ppt/.doc) and whole-chapter lessons with three computed time options. Moved here so nothing is built twice: the mock test generator (chapter scope) from V3 · Step 3, and reading a syllabus file from V3 · Step 10 (V3 keeps cross-chapter mock tests and syllabus-to-topic matching). V3 subject files gain teaching hours and marks per unit.

- **2026-10-03: New V3 "All Engineering"** (SPEC §12): syllabus breadth across all major B.Tech/BE branches in four waves, a `tested` tier (≥ 85%, target 90%), golden facts stored with source quotes, numeric and code checking, resumable evals. The old V3 becomes V-Final (SPEC §13). Points raised to the user: E&M and Engineering Maths have not passed the 95% gate (they are "sourced", not "verified"); mock tests were never built (pulled into V3 Step 3); golden facts must come from fetched source text with stored quotes, since the assistant is also a model; evals for ~60 subjects will take weeks on the free quota.

- **2026-10-02: Highlights and comments** (SPEC §8.1). The request placed it in "V2 Step 6 (Interaction tools)"; in our numbering Interaction tools is Step 7, already done, so it becomes a new Step 12 right after flashcards (so "Turn into flashcard" and "Add to flashcards" work from day one) and well after accounts/sync (annotations sync to `users/{uid}/annotations`). Planner is now 13, export & eval 14 (the PDF export and Last-Minute level include the "My notes" block). User asked for autonomous work through the end of V2, resuming after usage limits without waiting for confirmation.

- **2026-10-02: Accuracy tiers + universal visual toolkit** (SPEC §4.1 and §6.1). V2 grows from 11 to 13 steps; finished steps 1-7 are unchanged. New Step 9 (trust tiers & accuracy guards) and Step 10 (generic visual toolkit part 1 + visual planner); flashcards, planner and export/eval move to 11-13. Step 13 now also needs golden sets for E&M and Engineering Maths (>= 15 topics), `EVAL_LOG.md` and a public accuracy page; V2 is done only when Engineering Maths is `verified`. V3 Step 2 takes the rest of the toolkit (financial charts, timelines, maps, economics, CS, chemistry, images) and the high-stakes notes; V3 Step 8 takes the report-a-mistake feedback loop. The plan's "V2 Step 5 (second subject)" is our Step 6, already done with hand-coded maths widgets; the generic toolkit is therefore built as the new Step 10 instead of redoing Step 6.

- **2026-10-01: Accounts & cloud sync added** (SPEC §9). New V2 · Step 1: Firebase Spark (no billing, no Firebase Storage), Google sign-in only, local-first IndexedDB + Firestore outbox sync, a shared server-written lesson library (replaces the old "caching" item from V3 · Step 10), quota fallback and a study dashboard. The old V2 steps shift down one (now 11 steps). V3 · Step 8 Supabase sync is replaced by share links and mistake reports sent to Firestore. V1 is unchanged except Step 10 makes storage records sync-ready.

## V2 · Step 1 notes

- Firebase project `prism-study-7faa5` (Spark). Rules in `firestore.rules`, published manually (the Admin key cannot publish rules). `npm run test:firebase` passed 18/18 live checks on 2026-10-02.
- Sign-out clears the device copy (privacy on shared devices); a different account signing in also clears it first. Guest data merges into the first account.
- Firebase Analytics was enabled on the project but the app never loads it.

## V2 · Step 4 notes

- PDF text is extracted in the browser (pdfjs-dist; its worker is copied to `public/` by `scripts/copy-pdf-worker.mjs` on install/dev/build). Text lives in the local-only IndexedDB store `notes` (DB v3); `noteSummaries` (name, pages, 280-char summary) syncs.
- BM25 search (`src/lib/notes/retrieval.ts`) picks ≤ 8 passages × 1200 chars for the topic; the server validates them (`notesSources.ts`) and cites them as `notes-N` sources. Notes lessons skip the sample lessons and shared library, and save under a `:notes` id.
- Scanned (image-only) PDFs show "no text found"; OCR is not in scope.

## V2 · Step 5 notes

- Exam Prep lessons have a "Worksheet & past papers" block: a 4/6/8-question practice set (2/5/10 marks) or up to 10 pasted / PDF-loaded PYQs, solved by `/api/worksheet` (Zod + KaTeX check, 2 repair tries). Self-marking (full / half / none) is saved as a quiz attempt with lessonId `…:worksheet`, so weak-topic detection sees it. The last worksheet is cached per device in localStorage.
- Real Gemini check (2026-10-02): a 5-mark PYQ on a uniformly charged sphere came back correct (2.25×10³ and 1.12×10³ N/C) in ~20 s via the fallback model.

## V2 · Step 6 notes

- New subject `engg-math` (7 chapters, 44 topics) with sources from OpenStax Calculus Vol 1–3 (sections verified: a fake slug returns 404) and Wikipedia (titles verified via the API). `sources.ts` now supports several books per subject (`"calc3/6-4-greens-theorem"`).
- 8 maths widgets (function explorer, tangent line, Riemann sum, Taylor polynomial, 2×2 matrix transform, vector field with div/curl, slope field with RK4, Fourier series), numerics in `src/visuals/mathTools.ts` (tested), a new `derivation` visual (KaTeX steps revealed one at a time) and 3 PhET maths sims. WidgetView is now a typed table.
- The safe parser takes several variables (`parseFormula(src, ["x", "y"])`). Graph coordinates are rounded so server and browser render identical SVG (fixed a hydration mismatch).
- Prompts are subject-neutral (field from the subject data). Citation tags the AI writes into text ("[sourceIds: …]") are stripped. When a widget fits the topic, the prompt requires at least one; matrix-transform also accepts `{"matrix": [[a,b],[c,d]]}` because Gemini kept writing that.
- Real Gemini checks (2026-10-02): Taylor series (Deep Dive) used taylor-polynomial + a derivation; Green's theorem used vector-field; eigenvalues used matrix-transform. All fact-checked "sourced", 0 corrections, 24–33 s.

## V2 · Step 7 notes

- Every section has "Explain simpler" and "Give me an analogy" / "Another analogy" (previous analogies are sent as `avoid`). Selecting lesson text shows a toolbar with Explain / Define; answers open in a bottom card. All go through `/api/explain` (lesson re-validated, Zod + KaTeX check, one repair).
- Lessons now carry an optional `glossary` (4–10 terms, fact-checked with the rest). `rehypeGlossary` marks each term's first appearance per section (plurals too, never inside maths/code/links); `GlossaryTerm` shows a card on hover, focus or tap. Older saved lessons simply have no glossary.
- The selection popup's "＋ Flashcard" button is added in Step 9, when flashcards exist.
- Real Gemini: answers 7–10 s; one analogy took 67 s via fallback models, so `/api/explain` allows 60 s.

## V2 · Step 8 notes

- Prerequisites are data: each topic's `requires` list in the subject JSON (84 topics linked; a test checks every id exists and there are no cycles). Pure graph logic in `src/lib/conceptMap.ts` (layers, neighbourhood, statuses from the latest quiz/worksheet score, "revise first" gaps).
- Lessons (all levels except Last-Minute) have a "Concept map" block: two steps back, one forward, colour-coded by status, every node opens that topic at the same level and length; a weak prerequisite shows "Revise first". `/map?subject=…` shows the whole subject in layers (linked from the dashboard and account menu). On phones the layers stack with ↓ instead of arrows.

## V2 · Step 9 notes

- Each subject JSON has a `tier`; both are `sourced` until their golden sets pass >= 95% (Step 14 flips them to `verified`). A lesson drops to `limited` when retrieval found no source text (`src/lib/tiers.ts`): the prompt asks for a short, careful lesson and the page shows a banner with "upload your own notes". Every lesson shows its tier badge (tap for what it means).
- No source, no claim: the prompt now says "This could not be verified from the provided sources." instead of filling gaps; a Wikipedia source whose article is missing is dropped (`groundSources`).
- Widget safety is enforced in code: `visualProblem(visual, topicId)` rejects widgets/PhET not built for the topic, and the prompt only lists the fitting ones.
- Answer checks (SPEC §6.1 rule 7): worked examples with a numeric answer carry `check: {expression, answer}`; the server evaluates it in a locked-down mathjs (custom `nintegrate`/`nderivative`; import/evaluate/parse etc. disabled) and compares with the written answer (decimals, `\frac`/`\sqrt`/`\ln`/pi and SI prefixes understood). Mismatches go to the repair loop; on the last try a contradicted example is removed. A fact-check correction to an example removes its check. Checked examples show "✓ Answer checked by computer".
- Notes lessons: sections say "📒 From your notes" and/or "📚 Outside sources"; disagreements are written out as "your notes write X; the textbook writes Y".
- Shared library docs store `promptVersion`, `tier`, `sourceIds`; a different `PROMPT_VERSION` makes a library lesson stale (regenerated and overwritten on the next request). Saved copies in a student's library are not affected.
- Short bare-LaTeX quiz options/answers are wrapped in `$…$` in code (saves a repair round).
- Real Gemini (2026-10-03): definite integrals (Exam Prep) produced checks for 3 of 4 examples (the symbolic one correctly had none), all passing; a capacitor lesson's 4 checks all passed after one repair.

## V2 · Step 10 notes

- Generic visuals in `src/visuals/generic/` (Zod spec per type in `specs.ts`, sanity checks in `checks.ts`): `chart` (line, area, bar, stacked-bar, pie, donut, scatter, histogram, radar via Recharts 3, MIT, lazy-loaded; box plot in plain SVG), `graph` (functions, shaded area, tangent, points, vectors, equal axes), `formula` (formula explorer, maths by mathjs in a lazy chunk; specs checked with our small parser so mathjs stays out of the lesson bundle), `steps` (step-through), `stats` (normal curve, sampling/CLT, draggable + keyboard regression), `compare` (table, Venn, pros/cons, before/after). Mermaid now also allows mindmap, sequence, state, class, ER and Gantt.
- Data origin on every chart/stats visual: computed / sourced (must cite a lesson source id) / illustrative ("Illustrative example, not real data"). Sanity checks: pie % sums to 100, axes labelled, box order, contiguous histogram bins, series lengths, ≤ 8 pie slices, etc. Failing specs go to the repair loop, then are dropped.
- Visual planner (`src/lib/visualPlanner.ts`): preferred visuals per subject type and level, a `visualPlan` step at the top of the AI's JSON (not stored), "what to notice" captions and audio references. `PROMPT_VERSION` bumped to 2026-10-03.2 (older library lessons regenerate).
- PhET map extended (Graphing Quadratics, Graphing Lines, Trig Tour, Curve Fitting) to real topics only.
- Safe parser now accepts names like `c_0`, `a1`. Readouts use thousands separators (21,589) and graph ticks use k/M.
- `/dev/visuals` has a "Generic visuals" section with one sample of every type; a test checks every sample passes the schema and sanity checks.
- Real Gemini (2026-10-03): convergence tests → step-through; separable ODEs → slope field; power series → formula explorer + graph (after one repair for a 6th variable).

### ✅ Check this (Step 10): open `/dev/visuals`, scroll to "Generic visuals (any subject)"

- **Charts:** line (two cars), area, grouped bar, stacked bar, pie (40/30/10/20 with % labels), donut, scatter, histogram, box plot (two boxes with whiskers and a thick median line), radar. Hover a point or bar to see a tooltip. Each says "Illustrative example, not real data".
- **Graph:** y = x² with the area from 0 to 2 shaded and an orange tangent at P; the note says area ≈ 2.667 and slope 3. **Vectors:** a, b and a + b at true angles.
- **Formula explorer (compound interest):** move "Interest rate" from 8 to 12 → Amount goes from 21,589 ₹ to 31,058 ₹ and the orange dot moves along the curve. **Pendulum:** quadruple L and the period only doubles.
- **Step-through:** Next / Back walks through 3 steps with a progress bar and formulas.
- **Stats:** normal curve (move μ and σ; the shaded probability updates, 68.3% at the start); sampling (switch to "skewed", raise n from 2 to 30 and watch the histogram turn bell-shaped); regression (drag a point, or Tab to it and press arrow keys, and watch r fall from 0.999).
- **Compare:** table, Venn (two circles plus three lists), pros/cons, before/after. **Diagrams:** mind map, sequence, state, Gantt.
- **Edge case:** switch to light mode and to a 375px-wide window: everything fits with no sideways scrolling.

## V2 · Step 11 notes

- `flashcards` is a synced collection (IndexedDB v4 → `users/{uid}/flashcards`, in backups). Scheduling is SM-2 (`src/lib/flashcards/srs.ts`, tested): Again → 10 min, new cards 1 day (Easy 4), then 6 days, then ×ease.
- Cards come from: a lesson's glossary, quiz and common mistakes (🃏 Flashcards (N) in the lesson header, no AI, de-duplicated by a stable id); "＋ Flashcard" in the selection popup (front from the selection, back pre-filled with an AI definition, both editable); or "Add your own card" on `/flashcards`.
- `/flashcards`: due / reviewed / total, subject filter, flip with Space, rate with 1–4 (each button shows the next interval), list to edit or delete. Dashboard shows "N due now"; account menu links to it.

### ✅ Check this (Step 11)

- Open a Gauss's law lesson → press **🃏 Flashcards (13)** → "✓ 13 cards added"; press again → "You already have these 13 cards".
- Select a phrase in a lesson → **＋ Flashcard** → the back fills in with a short definition → **Save flashcard**.
- Go to **/flashcards** (or Dashboard → "Flashcards due today") → Space shows the answer → press 3 (Good) → "Due now" drops by one. Press 1 (Again) on another and it comes back in 10 minutes.
- Sign in on a second device: the same cards and due dates appear (synced).
- Edge case: on a private window with storage blocked, the page says flashcards can't be kept instead of breaking.

## V2 · Step 12 notes

- `annotations` is a synced collection (IndexedDB v5, index by lesson → `users/{uid}/annotations`; in backups and the guest merge). Annotations are never stored inside a lesson. Each saves lessonId + lesson version (createdAt), block (`section:<id>`, `example:<n>`, `quiz:<n>`, `visual:<id>`, `analogy:<n>`, `mistake:<n>`, `revision`), offsets, quote, prefix and suffix.
- Anchoring (`src/lib/annotations/anchor.ts`, tested): offsets first, then quote search scored by surrounding text; not found → kept as an "unanchored note" at the top of its section. Overlaps: same colour merges (comments kept), another colour takes the overlap and trims/splits the old highlight.
- Painting uses the CSS Custom Highlight API (`::highlight(prism-…)` in globals.css), so the DOM is never changed: KaTeX, glossary cards and the audio highlight are unaffected. Browsers without it still list every note in "My notes".
- UI: selection toolbar row of four colour swatches + 💬 Comment (Alt+H focuses it from a keyboard selection); tapping a highlight opens the editor (colour, comment with autosave and 1,000-character limit, Explain this simpler, Turn into flashcard, Remove); 📝 on sections, visuals, worked examples and quiz questions; comments as 💬 margin markers on desktop (≥1024px) and inline on phones; "📝 My notes (N)" panel with legend and "Show only my highlights"; "My notes" block first in Last-Minute Revision; `/my-notes` page (subject, chapter, colour, date filters and search; links open the lesson scrolled to the note); "Didn't understand" highlights appear in the dashboard's weak topics. The PDF uploads page is now called "Uploaded notes" to avoid confusion.
- Bug found and fixed while testing: the lesson article's ref callback was re-created every render, which re-rendered the page in a loop and kept cancelling the comment autosave.

### ✅ Check this (Step 12)

1. Open any lesson. Select a sentence and tap each colour in turn on four different sentences: yellow (Important), red (Didn't understand), blue (Formula/definition), green (Exam-likely).
2. Select another phrase → **💬 Comment** → type a comment → it says "✓ Saved". Tap any highlight to change its colour or comment.
3. Press 📝 on a worked example and write a note.
4. **Refresh the page**: all highlights, the comment (💬 in the margin on a laptop, inline on a phone) and the note are still there; "📝 My notes" lists them in reading order.
5. Tick **Show only my highlights**: the lesson shrinks to just your marked passages.
6. **Sign in on a second device** (or another browser) with the same Google account and open the same lesson (same level and length): everything is there. Also check **/my-notes** and the dashboard's weak topics.

- Edge case: overlap a yellow highlight with a green one in its middle → the yellow splits into two pieces around the green.

## V2 · Step 13 notes

- Scheduler (`src/lib/planner/plan.ts`, tested): topological study order from the concept-map prerequisites with weak topics (quiz < 60% or "didn't understand" highlights) as early as allowed; each day = flashcards (10 min, if the student has cards) + revision of topics learned 1 and 3 days earlier (10 min each) + new lessons that fit, always keeping room for one lesson; leftovers are shown as overflow, never dropped.
- `plans` is a synced collection (IndexedDB v6, one plan per subject, `plan:<subject>`); ticking an item stores `doneAt`. `/planner`: subject tabs, setup (minutes per day, lesson length, level, exam date or 3–30 days, topic chips: mastered left out, ⚠ weak), then the day list with tick boxes, progress bar, catch-up hint and overflow. Revision items open the Last-Minute (5-min) lesson.
- Progress tracker on the dashboard: 🔥 study streak (any day with a lesson view, quiz, flashcard review, note or ticked plan item; a streak that ended yesterday is still alive today), "Today's plan" with tick boxes, and chapter progress bars per subject (mastered / tried / weak).
- Recent-topic history keeps only each topic's latest view, so older streak days come from quizzes, flashcards, notes and the plan.

### ✅ Check this (Step 13)

- Dashboard → **Make a plan** (or account menu → Backlog planner). Choose 1 hour a day, 15-min lessons, 7 days → **Build my 7-day plan**.
- You see 7 days: today has ~4 lessons; tomorrow starts with "🔁 Revise" items for today's topics; topics you've mastered are missing and ⚠ weak ones come early (but never before what they build on). Anything that didn't fit is listed at the bottom.
- Tick an item → "1 of N done"; refresh → still ticked; sign in on another device → same plan and ticks.
- Dashboard shows 🔥 your streak, today's items (tick them there too) and the chapter progress bars.
- Edge case: pick only 20 minutes a day with 30-min lessons → you still get one lesson per day (the plan never leaves a day empty).

## V2 · Step 14 notes

- "🖨️ Revision PDF" on every lesson opens the print dialog with a clean sheet (formulas, key points, memory tricks, glossary, worked-example answers, common mistakes, the student's own highlights and comments, sources with links); print CSS shows only that sheet, black on white. "Save as PDF" makes the file. Last-Minute Revision already starts with "My notes".
- Golden sets: `eval/golden/em.json` (40 topics, 119 facts) and `eval/golden/engg-math.json` (18 topics, 52 facts), generated from readable patterns by `node eval/build-golden.mjs`. `npm run eval` runs every subject, adds visual checks (valid for the topic; numbers on "sourced" charts must appear in the lesson or cited source), saves each lesson's text, writes `eval/results/<subject>.json`, appends a row to `EVAL_LOG.md` and updates `src/data/accuracy.json`. `npx tsx eval/inspect-misses.ts` shows each missed fact in context; `npx tsx eval/rescore.ts` re-scores saved lessons after a scorer fix.
- The fact-check pass now also lists core textbook facts a lesson never states; they are added to the revision sheet if they typeset (`addMissingFacts`). Prompt 2026-10-03.4 also asks for "core content at every level".
- `/accuracy` (linked from the footer and every tier badge) lists each subject's tier, golden-set size and latest measured score.
- Eval history (see EVAL_LOG.md): em 71.4 → 79.8 → 79.8 (83.2 re-scored); engg-math 78.8 → 76.9 → 88.5. Not yet ≥ 95%, so both subjects remain "sourced". Run 3 was hurt by the free quota running out (five topics never got their fact-check).

### ✅ Check this (Step 14)

- Open any lesson → **🖨️ Revision PDF** → the print preview shows a 1–2 page revision sheet (formulas typeset, your highlights under "My notes", sources at the end) → choose "Save as PDF".
- Visit **/accuracy** (footer link "How accurate is Prism?"): both subjects show "📚 Sourced" with their latest scores (em 79.8%, maths 88.5%) and an explanation of the tiers.
- Open **EVAL_LOG.md** in the repo: three dated runs and notes on every scorer change.
- To finish the gate yourself later: `npm run eval` (≈ 40 min, needs the free Gemini quota) → if a subject shows ≥ 95%, change its `"tier"` to `"verified"` in `src/data/subjects/<subject>.json`.

## Known issues / leftovers

- Windows: `npm test` goes through `scripts/vitest.mjs`, which fixes a lowercase drive letter (c:\) that otherwise breaks every test.

- Dev tip: if the page looks stuck on old styles, check `about:debugging#/runtime/this-firefox` for a stale service worker on `localhost:3000` (the separate "Register" project installs one there). Its cache-first rule serves outdated `/_next/static` files in dev mode.

## V1 status for the next session

- Live deploy: not done yet. Needs the user's Vercel login (steps in README → "Put it online").
- `npm run eval`: harness verified with `-- --fake`. Real accuracy number still to be measured once GEMINI_API_KEY is set; prompts may need tuning to reach ≥ 95%.
- Real Gemini calls have only been tested with a mocked network and an invalid key; the first real lesson should be checked by eye.
- Not in V1 by design: "report a mistake" button (§6.6), sleep timer and watch-along audio (V2), 30–90 min audio (V2).
