# Progress

Update this after every step so any person or AI tool can pick up the work.

**Current:** V2 · Step 11 (Flashcards + spaced repetition). User approved autonomous build through the end of V2 (2026-10-02).

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

| Step | Title                                        | Status         |
| ---- | -------------------------------------------- | -------------- |
| 1    | Accounts, cloud sync & shared lesson library | ✅ Done        |
| 2    | All 6 levels                                 | ✅ Done        |
| 3    | Long audio                                   | ✅ Done        |
| 4    | PDF upload + retrieval                       | ✅ Done        |
| 5    | PYQ / worksheet mode                         | ✅ Done        |
| 6    | Engineering Mathematics + visuals part 2     | ✅ Done        |
| 7    | Interaction tools                            | ✅ Done        |
| 8    | Prerequisite concept map                     | ✅ Done        |
| 9    | Trust tiers & accuracy guards                | ✅ Done        |
| 10   | Generic visual toolkit part 1 + planner      | ✅ Done        |
| 11   | Flashcards + spaced repetition               | ⬜ Not started |
| 12   | Highlights & comments                        | ⬜ Not started |
| 13   | Backlog planner & progress tracker           | ⬜ Not started |
| 14   | Export & eval (golden sets, accuracy page)   | ⬜ Not started |

When V2 · Step 1 starts: give the user click-by-click Firebase console setup (Spark project, Google sign-in, Firestore database, web config, service account key, authorized domains).

## Plan changes

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

## Known issues / leftovers

- Windows: `npm test` goes through `scripts/vitest.mjs`, which fixes a lowercase drive letter (c:\) that otherwise breaks every test.

- Dev tip: if the page looks stuck on old styles, check `about:debugging#/runtime/this-firefox` for a stale service worker on `localhost:3000` (the separate "Register" project installs one there). Its cache-first rule serves outdated `/_next/static` files in dev mode.

## V1 status for the next session

- Live deploy: not done yet. Needs the user's Vercel login (steps in README → "Put it online").
- `npm run eval`: harness verified with `-- --fake`. Real accuracy number still to be measured once GEMINI_API_KEY is set; prompts may need tuning to reach ≥ 95%.
- Real Gemini calls have only been tested with a mocked network and an invalid key; the first real lesson should be checked by eye.
- Not in V1 by design: "report a mistake" button (§6.6), sleep timer and watch-along audio (V2), 30–90 min audio (V2).
