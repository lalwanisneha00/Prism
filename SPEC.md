# Prism: Product Spec

The single source of truth for what we are building. If code and spec disagree, update one of them on purpose.

## 1. Vision

A study guide for college students who struggle because a professor taught a topic badly, they were absent, or they have a backlog. The student enters **subject → chapter → topic(s)**, picks a **learning level** and a **time budget**, and gets:

- A clear, level-appropriate explanation with everyday analogies
- **Accurate visuals** (interactive simulations, diagrams, graphs, real images)
- An **audio lesson** (AI-voice teacher), 5 to 90 minutes
- Worked examples, quizzes, and a revision sheet
- Citations for everything, plus the best free lecture videos
- Optional upload of the student's own material (PDFs, worksheets, previous-year papers) so the lesson follows _their_ syllabus

It must feel **better than asking ChatGPT**: structured, visual, sourced, consistent, and full of small conveniences.

**Scope:** V1 covers one subject deeply (Electricity & Magnetism / Applied Physics). V2 adds uploads and more subjects. V3 goes universal. The architecture is subject-agnostic from day 1: a new subject is new data, not a rewrite.

## 2. Learning levels

| #   | Level                | Who it's for                   | Content style                                                                            |
| --- | -------------------- | ------------------------------ | ---------------------------------------------------------------------------------------- |
| 1   | First Encounter      | Never seen it                  | Everyday analogy first, zero jargon, one idea at a time, lots of visuals                 |
| 2   | Building Blocks      | Seen it, shaky basics          | Prerequisite recap → connect pieces → then the concept                                   |
| 3   | Second Chance        | Studied 2–3 times, still stuck | A different angle and analogy from L1, plus the top misconceptions and why they're wrong |
| 4   | Deep Dive            | Wants real understanding       | Step-by-step derivations, edge cases, the "why" behind formulas, papers                  |
| 5   | Exam Prep            | Test coming up                 | Question patterns, solved problems (from PYQs), marking tips, traps                      |
| 6   | Last-Minute Revision | Exam in hours                  | One-page cheat sheet, formulas, 10 rapid recall questions, mnemonics                     |

Each level has its own prompt template and page layout. Levels live in a config file.

## 3. Tech stack (all free)

- Next.js (App Router) + TypeScript (strict) + Tailwind CSS, deployed on Vercel Hobby
- AI: Gemini API free tier, **server routes only**, behind an `llm/` adapter (Groq as fallback). Users may paste their own Gemini key in Settings.
- Structured output: JSON validated with **Zod**; invalid → retry with the error message
- Audio: Web Speech API (`speechSynthesis`)
- Math: KaTeX · Diagrams: Mermaid · Plots: Mafs or JSXGraph
- Physics widgets: hand-coded React + Canvas/SVG
- External sims: PhET (iframe, CC-BY 4.0, attribution shown)
- Images: Wikimedia Commons API (attribution shown)
- Sources: Wikipedia REST, OpenStax links, arXiv + OpenAlex, curated YouTube (MIT OCW, NPTEL, Khan Academy)
- PDF: PDF.js in the browser, client-side chunking
- Storage: IndexedDB via `idb` in `src/lib/storage/`, always the **main copy** (local-first)
- Accounts & sync (from V2): Firebase **Spark plan only, billing never enabled**. Google sign-in, Firestore for sync and the shared lesson library, Firebase Admin SDK in Vercel API routes. **No Firebase Storage** (it needs Blaze). See §9.
- Testing: Vitest + a golden-set eval script

## 4. Visual strategy

The AI **never draws visuals from scratch**. It **chooses and configures** visuals from trusted sources, in this priority:

1. **Widget library**: hand-coded, tested React widgets. AI returns `{ "widget": "field-lines", "params": {...} }`.
2. **PhET embed** when a matching sim exists (topic → URL map in a data file).
3. **Mermaid** for structure only (concept maps, flows). Validate syntax; retry once, else hide.
4. **Function plot** from an AI-provided equation, rendered by the library.
5. **Wikimedia Commons image** with caption and licence.
6. Fallback: a "key idea" card with an icon-based analogy.

`src/visuals/registry.ts` lists every widget, its params, and the topics it fits. This list is sent to the AI so it can only pick real widgets.

### 4.1 Universal visual toolkit (plan update 2026-10-02, Part B)

Every subject should be as visual as V1's physics. **The AI still never draws:** it picks a visual type and supplies a small, Zod-validated data spec; a trusted library or hand-coded component draws it and does the maths.

- **Two kinds of visuals.** _Generic visuals_ (data-driven components, safe in any subject and any trust tier, including interactive ones: sliders, hover, zoom, step-through). _Topic-specific simulations_ (hand-coded widgets and PhET), allowed only for the exact topics listed in the registry.
- **Generic toolkit** (`src/visuals/generic/`, free/open-source libraries only, licence checked, lazy-loaded): (1) charts: line, area, bar grouped/stacked, pie/donut, scatter, histogram, box plot, radar; (2) financial: candlestick/OHLC + volume, moving averages, support/resistance, pattern markers; (3) function and geometry plots: tangents, areas, vectors, constructions; (4) **formula explorer**: formula + variables + ranges → sliders and a live graph/value computed with mathjs; (5) structure diagrams in Mermaid: flowchart, mind map, sequence, state, class/ER, Gantt (syntax-validated); (6) timelines; (7) comparison: side-by-side tables, Venn, pros/cons, before/after; (8) step-through animations with next/back; (9) maps (Leaflet + OpenStreetMap, attributed); (10) statistics explorers: normal curve with mean/SD sliders, sampling demo, regression through draggable points; (11) economics/commerce: supply-demand shifts, T-accounts, balance sheets, break-even, cash-flow waterfall; (12) computer science: sorting/searching/tree/graph/stack/recursion visualisers, truth tables, logic gates, memory diagrams; (13) chemistry: molecules rendered from PubChem identifiers (never AI-written structures), periodic table highlights, reaction energy diagrams; (14) Wikimedia Commons images with licence; (15) PhET beyond E&M.
- **Where chart data comes from:** _computed_ in code from a formula (preferred); _sourced_ from retrieved sources with the citation under the chart; or _illustrative_ teaching data, always labelled "Illustrative example, not real data". Trading/finance charts use illustrative or pattern-template data generated in code plus a fixed "educational, not investment advice" note. The AI never states real prices, statistics or dates on a chart without a source.
- **Visual planner:** a generation step decides, per section, whether a visual helps and which registry type; a visual on every major concept where it aids understanding, none where it would be decoration. Each subject type has a preferred visual set (maths: plots, formula explorer, step-throughs; trading: candlesticks, line charts, formula explorer; law: timelines, flowcharts, comparison tables; biology: labelled images, cycles, step-throughs). Level 1 gets one-idea visuals, Level 4 detailed interactive ones, Level 6 compact summaries.
- Every visual has a caption saying **what to notice** and is referenced in the audio script for watch-along.
- **Validation and fallbacks:** one Zod schema per type; code sanity checks (pie slices sum to 100%, axes labelled with units, candles high >= open/close >= low, readable series counts, numbers agree with the text). Invalid spec: retry once, then a simpler visual, then no visual; never a broken or empty chart. `npm run eval` also checks visuals. Everything works at 375px, in dark and light mode, and by keyboard.
- `/dev/visuals` (hidden) shows every visual type with sample data.

## 5. Lesson data format

One Zod-validated JSON object per lesson (`src/lib/schema.ts`):

```ts
Lesson {
  meta: { subject, chapter, topic, level, durationMin, createdAt, sources: Source[] }
  hook: string
  prerequisites: { concept, oneLiner }[]
  sections: Section[]
  analogies: { concept, analogy, whereItBreaks }[]
  workedExamples: { problem, steps: string[], answer }[]
  misconceptions: { wrong, right, why }[]
  quiz: { question, options?, answer, explanation, difficulty }[]
  revisionSheet: { formulas: string[], keyPoints: string[], mnemonics?: string[] }
  audioScript: AudioChunk[]
  furtherLearning: { videos: Link[], papers: Link[], readings: Link[] }
}
Section { title, body (markdown + KaTeX), visual?: VisualSpec, sourceIds: string[] }
VisualSpec = { type: "widget"|"phet"|"mermaid"|"plot"|"image", ...config }
```

Every factual section references at least one `sourceId`.

## 6. Accuracy system (target ≥ 95% on a measured set)

1. **Grounding (RAG):** fetch Wikipedia/OpenStax excerpts and uploaded PDFs, pass them to the model; unsupported claims are marked "beyond sources".
2. **Two-pass generation:** writer pass, then a verifier pass that checks formulas, numbers, definitions and claims against sources; apply corrections.
3. **Deterministic checks:** units, KaTeX parses, Mermaid parses, quiz answer ∈ options, arithmetic re-checked in code.
4. **Confidence badges:** "Sourced ✓" / "Verify ⚠" per section.
5. **Golden set:** `eval/golden.json` (30+ topics with key facts); `npm run eval` reports % correct. Run after every prompt change.
6. **Report a mistake:** saved locally, listed on a dev page (V3: sent to Firestore via a server route).
7. **Caching:** verified lessons are stored once in the shared Firestore lesson library (§9.4) and checked before calling Gemini (V2 · Step 1).

The UI states honestly that AI can make mistakes and links every claim to its source.

### 6.1 Keeping V1-level accuracy as Prism grows (plan update 2026-10-02, Part A)

1. **Trust tiers** in each subject's config: `verified` (own golden set, passes >= 95%), `sourced` (grounding sources, no golden set yet), `limited` (weak or no sources). The tier shows as a badge on every lesson.
2. **Per tier** (as refined by §4.1): `verified`: full lesson, all visuals. `sourced`: full lesson with citations, all _generic_ visuals; topic-specific widgets and PhET only for their exact topics. `limited`: shorter lesson, a visible "limited sources, please verify" banner and a prompt to upload the student's own material.
3. **No source, no claim:** when retrieval is too thin for a section, the lesson says what it could not verify instead of filling the gap; the verifier removes or flags unsupported claims. Every source link comes from retrieval and is checked to exist.
4. **Widget safety:** a topic-specific widget can only be used for a topic in its registry list; otherwise fall back to a generic visual or none (enforced in code, not only in the prompt).
5. **Release gate:** a new subject starts as `sourced`. It becomes `verified` with its own golden set (>= 15 topics, key facts from a trusted textbook) passing >= 95% on `npm run eval`. Engineering Mathematics must pass this before V2 is done.
6. **Regression testing:** `npm run eval` runs every verified subject's golden set; run it after any change to prompts, schema, retrieval or model, and stop if a verified subject drops below 95%. Each run's scores and date go in `EVAL_LOG.md`.
7. **Maths and numbers:** recompute worked-example arithmetic in code where possible, check units, KaTeX parse-check every formula; for Engineering Mathematics, verify final answers with mathjs where the problem type allows.
8. **Uploaded material first:** lessons from a student's notes are grounded in them first and label which parts come from the notes versus outside sources; when they disagree, show both and say so.
9. **High-stakes fields (V3):** law, medicine, finance etc. carry a fixed "study aid, check the official textbook or statute" note and prefer `limited` over guessing.
10. **Shared library:** only verified lessons are cached; each stores its tier, sources and the prompt/eval version that produced it. When prompts change, older cached lessons are stale and are regenerated on the next request.
11. **Feedback loop (V3):** "Report a mistake" entries are tagged by subject and topic; three or more reports on a cached lesson mark it for regeneration and make the topic a golden-set candidate.
12. **Public accuracy page:** each verified subject, its golden-set size and latest score, and what the tiers mean.

## 7. Audio lessons

- Presets: 5, 10, 15, 30, 45, 60, 90 minutes; ≈140 words/min.
- Generated in chunks: outline first, then each chapter.
- Style varies by level (storytelling for L1, rapid-fire for L6).
- Player: play/pause, ±15 s, speed 0.75–2×, voice picker, chapters, highlight the current sentence, resume, sleep timer.
- Watch-along: the matching visual scrolls into view during narration.
- V3 option: download audio (MediaRecorder) or export transcript.

## 8. Convenience features

| Feature                                                   | Version |
| --------------------------------------------------------- | ------- |
| Recent topics, saved lessons library                      | V1      |
| Dark/light mode, mobile-first, keyboard shortcuts         | V1      |
| Skeleton loaders, fun loading messages, section streaming | V1      |
| "Explain simpler", "Another analogy"                      | V2      |
| Text-selection popup (explain / define / flashcard)       | V2      |
| Glossary hover cards                                      | V2      |
| Prerequisite concept map                                  | V2      |
| Flashcards with spaced repetition                         | V2      |
| Backlog planner                                           | V2      |
| Progress tracker (chapters, streak, weak areas)           | V2      |
| PDF / print export                                        | V2      |
| Google sign-in, cloud sync, study dashboard               | V2      |
| Export / import backup file (safety net)                  | V2      |
| Focus mode / Pomodoro                                     | V3      |
| "Ask a doubt" chat scoped to the lesson                   | V3      |
| Adaptive level from quiz scores                           | V3      |
| Mock test generator from PYQs                             | V3      |
| Share lesson via link                                     | V3      |
| English / Hindi / Gujarati                                | V3      |
| PWA with offline saved lessons                            | V3      |
| Accessibility (screen reader, transcripts, dyslexia font) | V3      |

## 8.1 Highlights and comments (plan update 2026-10-02)

Students highlight parts of a lesson and attach their own comments, so revisiting a topic is faster.

- **Highlighting:** the selection popup offers Highlight and Add comment next to Explain, Define and Add to flashcards. Four colours with fixed meanings in a small legend: Important, Didn't understand, Formula/definition, Exam-likely. Tapping a highlight lets the student change its colour, add/edit a comment or remove it.
- **Comments** attach to a highlight, or to a whole section, visual, worked example or quiz question via a small "add note" icon (for formulas and charts, where selection doesn't work). Desktop: marker in the margin; mobile: inline; both open on tap. Plain text with line breaks, up to about 1,000 characters.
- **Anchoring that survives changes:** annotations are stored per user, never inside the (read-only, shared) lesson. Each saves the lesson ID and version, section ID, character offsets, the exact quoted text and a little text before and after it. On load: anchor by offsets, then by searching for the quote. If a regenerated lesson no longer has the passage, the annotation is kept as an "unanchored note" at the top of that section, never silently deleted.
- **Storage and sync:** through `src/lib/storage` (IndexedDB first, synced to `users/{uid}/annotations` when signed in; guests work locally); autosave with batched writes; included in export/import backup and the guest-to-account merge.
- **My Notes:** a panel on the lesson page listing that lesson's highlights and comments in order (click to scroll), and a "My Notes" page across all topics with filters (subject, chapter, colour, date) and search.
- **Revision use:** "Show only my highlights" collapses a lesson to highlighted passages and comments; a "My notes" block in Last-Minute Revision and in the PDF export; "Didn't understand" highlights feed the weak-topics list and each gets an "Explain this simpler" shortcut; one-tap "Turn into flashcard" on any highlight.
- **Details:** highlights must not break KaTeX, the audio sentence highlight (clearly different styling) or glossary hover cards; overlapping highlights merge or split cleanly; touch selection at 375px, dark and light mode, keyboard access. Annotations are private and never part of shared lesson links.

## 9. Accounts & cloud sync (Firebase Spark, free forever)

Goal: progress syncs across devices and is never lost, while staying **100% free on the Firebase Spark plan with billing never enabled**.

### 9.1 Spark limits we design around

| Service       | Free limit                                                                                                                          |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Auth          | 50K monthly active users                                                                                                            |
| Firestore     | 1 GiB stored · 50K reads/day · 20K writes/day · 20K deletes/day · 10 GiB/month egress · 1 database per project · 1 MiB per document |
| Cloud Storage | **Not available on Spark** (needs Blaze since Sept 2024). Do not use Firebase Storage.                                              |

If any quota is exceeded the app **degrades gracefully and never crashes** (§9.6).

### 9.2 Auth

- Firebase Authentication with **Google sign-in only**. No email/password, magic link, or phone/OTP.
- **Guest mode stays:** the app is fully usable without signing in.
- On first sign-in, the guest's local data is **merged into the account without duplicates** (match by item ID; on a clash, keep the newer `updatedAt`).

### 9.3 Local-first sync

- IndexedDB (`src/lib/storage/`) is the main copy. The UI reads and writes only the local copy, so it is fast and works offline.
- When signed in, a background sync engine pushes changes to Firestore through an **outbox queue** (survives offline periods and reloads).
- Conflicts: **latest timestamp wins, per item**. Every record carries `id`, `updatedAt` and a `deleted` flag (tombstone) so deletes sync too.
- Firestore offline persistence is enabled.
- A user's data is **loaded once per session**, then the app works from the local copy. Never re-read on every page view.
- Writes are **batched**; frequent ones are **debounced** (e.g. audio position saved every 30 s and on pause or page close).

### 9.4 Shared lesson library

- Each verified lesson is stored **once** in `lessons/{subject_topic_level_duration}`, compressed (gzip) and kept under 1 MiB.
- Written **only by the server** (Firebase Admin SDK in a Vercel API route), never by clients.
- `/api/lesson` checks the library **before** calling Gemini, which saves AI quota and keeps answers consistent. Guests benefit too because the check runs on the server.
- Users store only **references** (lesson IDs) to library lessons.
- Lessons built from a user's private uploads are **never** put in the shared library. They stay local, or under `users/{uid}/` if small.

### 9.5 What syncs (`users/{uid}/...`)

Recent topics · saved lesson IDs · quiz attempts and scores · weak topics · flashcards and review schedule · mock test results · planner schedules · audio resume position · settings.

**Stays on the device:** uploaded PDFs and their full extracted text. Only file names and short summaries sync.

### 9.6 Security & quota safety

- Firestore rules: a user can read and write only `users/{theirUid}/**`. Signed-in users can read `lessons/**`; **no client can write** `lessons/**`. Everything else is denied.
- Firebase web config lives in `NEXT_PUBLIC_FIREBASE_*` env variables. Admin credentials are **server-only** env variables.
- The Vercel domain is added to Firebase Auth's authorized domains.
- A small usage counter (reads/writes made by the app) is shown on the admin dev page.
- On a Firestore quota error the app switches to **local-only mode** with a friendly message: _"Sync paused, your progress is safe on this device"_. It retries later.
- **Export / import backup** (a JSON file) stays available as a safety net for guests and signed-in users.

### 9.7 UI

- "Sign in with Google" button
- Profile menu: name, photo, sync status (**Synced ✓ / Syncing… / Offline / Sync paused**), sign out, **"Delete my account and data"**, a short privacy note
- **My study dashboard** after sign-in: "Continue where you left off", weak topics to revise, flashcards due today, recent mock test scores (each card shows an empty state until that feature exists)

## 10. Version 1: Foundation

**Goal:** a deployed app teaching E&M at levels 1, 3 and 6 with accurate interactive visuals, sources and read-aloud audio.

1. Project setup: Next.js + TS + Tailwind, folders, ESLint/Prettier, SPEC/CLAUDE/PROGRESS, git, GitHub
2. Design system & layout: tokens, typography, dark/light, header, hero, responsive shell
3. Topic picker: E&M, chapter dropdown, topics from `src/data/subjects/em.json`, 3 levels, duration, validation
4. Lesson schema: Zod schema, types, hand-written sample lesson; plus a type-to-search topic box (added at user request; still limited to known topics)
5. Lesson page renderer: sections, KaTeX, analogies, examples, misconceptions, interactive quiz, revision sheet (no AI)
6. AI integration: `/api/lesson`, Gemini adapter, level prompts, validation + retry, streaming, error and rate-limit states
7. Sources & grounding: Wikipedia/OpenStax excerpts, per-section citations, verifier pass
8. Visual library part 1: registry + 6–8 E&M widgets, PhET map, Mermaid with validation, AI picks visuals
9. Audio: script for chosen duration, Web Speech player (speed, voice, chapters, highlighting)
10. Save, polish, deploy: IndexedDB layer in `src/lib/storage/` (records already carry `id`, `updatedAt`, `deleted` so V2 sync needs no rewrite), saved lessons, recent topics, states, mobile check, Vercel, 15-topic golden set + `npm run eval`

**Done when:** on the live URL on a phone, "Gauss's Law" generates at all 3 levels with correct interactive visuals and citations, and a 10-minute audio lesson plays.

## 11. Version 2: Personal & powerful

1. **Accounts, cloud sync & shared lesson library (§9):** Firebase Spark project, Google sign-in, guest-data merge, outbox sync engine, security rules, server-written lesson library checked before Gemini, quota fallback + usage counter, profile menu, delete account, privacy note, study dashboard, export/import backup
2. All 6 levels
3. Long audio (90 min, resume synced with debounce, sleep timer, watch-along)
4. PDF upload + browser BM25 retrieval, "from your notes" badges (files stay on device; names + summaries sync)
5. PYQ/worksheet mode for Exam Prep
6. Engineering Mathematics + more widgets
7. Explain simpler, another analogy, selection popup, glossary
8. Prerequisite concept map
9. **Trust tiers & accuracy guards (§6.1 rules 1-4, 7, 8, 10):** tier per subject + badge + per-tier behaviour, "could not verify" handling, widget-topic enforcement in code, mathjs answer checks for Engineering Maths, notes-vs-sources labelling, library entries store tier/sources/prompt version and go stale on prompt change
10. **Generic visual toolkit part 1 + visual planner (§4.1 items 1, 3, 4, 5, 7, 8, 10):** charts, function/geometry plots, formula explorer (mathjs), Mermaid diagram types, comparison visuals, step-through, statistics explorers; visual planner step; data-source labels (computed / sourced / illustrative); code sanity checks and fallbacks; PhET map beyond E&M; all in `/dev/visuals`
11. Flashcards + spaced repetition (synced), incl. "+ Flashcard" in the selection popup
12. **Highlights & comments (§8.1):** four-colour highlights and comments with robust anchoring, synced annotations, My Notes panel and page, "show only my highlights", weak-topic feed, "Turn into flashcard"
13. Backlog planner + progress tracker (synced)
14. **Export & eval (§6.1 rules 5, 6, 12):** PDF export of revision sheets (with the student's "My notes" block, which also appears in Last-Minute Revision); golden sets for E&M (40 topics) and Engineering Maths (>= 15 topics); every verified subject >= 95%; visual checks in the eval; `EVAL_LOG.md`; public accuracy page

**Done when:** signing in with Google on a laptop and a phone shows the same progress; upload a college PDF → lesson follows it; 45-min audio; flashcards; 7-day backlog plan; Engineering Maths is `verified` (>= 95% on its golden set) and every lesson shows its trust tier.

## 12. Version 3: Universal & final

1. Free-text topic input + syllabus parsing · 2. Subject-type routing (templates + preferred visual sets per field; generic toolkit part 2: §4.1 items 2, 6, 9, 11, 12, 13, 14; high-stakes notes and the `limited` tier, §6.1 rule 9) · 3. Papers (arXiv/OpenAlex) and curated lectures · 4. Ask-a-doubt chat · 5. Adaptive learning · 6. Mock tests (results synced) · 7. Focus mode, Pomodoro, streaks · 8. Shareable lesson links (library lesson IDs) + "report a mistake" flags sent to Firestore via a server route, with the feedback loop of §6.1 rule 11 · 9. Hindi/Gujarati, PWA, accessibility · 10. Hardening: rate limits, BYO key, analytics, Lighthouse 90+, multi-subject eval, README + demo, launch checklist

**Done when:** law, engineering and commerce students each get an accurate, sourced, visual lesson with audio, and the eval is ≥ 95% on the multi-subject golden set.
