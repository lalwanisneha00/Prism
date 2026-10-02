# Progress

Update this after every step so any person or AI tool can pick up the work.

**Current:** V2 · Step 8 (Prerequisite concept map). User approved autonomous build through the end of V2 (2026-10-02).

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
| 8    | Prerequisite concept map                     | ⬜ Not started |
| 9    | Trust tiers & accuracy guards                | ⬜ Not started |
| 10   | Generic visual toolkit part 1 + planner      | ⬜ Not started |
| 11   | Flashcards + spaced repetition               | ⬜ Not started |
| 12   | Backlog planner & progress tracker           | ⬜ Not started |
| 13   | Export & eval (golden sets, accuracy page)   | ⬜ Not started |

When V2 · Step 1 starts: give the user click-by-click Firebase console setup (Spark project, Google sign-in, Firestore database, web config, service account key, authorized domains).

## Plan changes

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

## Known issues / leftovers

- Windows: `npm test` goes through `scripts/vitest.mjs`, which fixes a lowercase drive letter (c:\) that otherwise breaks every test.

- Dev tip: if the page looks stuck on old styles, check `about:debugging#/runtime/this-firefox` for a stale service worker on `localhost:3000` (the separate "Register" project installs one there). Its cache-first rule serves outdated `/_next/static` files in dev mode.

## V1 status for the next session

- Live deploy: not done yet. Needs the user's Vercel login (steps in README → "Put it online").
- `npm run eval`: harness verified with `-- --fake`. Real accuracy number still to be measured once GEMINI_API_KEY is set; prompts may need tuning to reach ≥ 95%.
- Real Gemini calls have only been tested with a mocked network and an invalid key; the first real lesson should be checked by eye.
- Not in V1 by design: "report a mistake" button (§6.6), sleep timer and watch-along audio (V2), 30–90 min audio (V2).
