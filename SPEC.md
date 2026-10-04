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

**Scope:** V1 covers one subject deeply (Electricity & Magnetism / Applied Physics). V2 adds personal features and a second subject. V3 covers all engineering branches. V-Final goes universal. The architecture is subject-agnostic from day 1: a new subject is new data, not a rewrite.

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

1. **Trust tiers** in each subject's config: `verified` (own golden set, passes >= 95%), `tested` (own golden set, passes >= 85%; added in V3, §12.3), `sourced` (grounding sources, no golden set yet), `limited` (weak or no sources). The tier shows as a badge on every lesson.
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
| Mock test generator from PYQs                             | V2.5/V3 |
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

**Stays on the device:** uploaded files (any format) and their full extracted text. Only file names and short summaries sync.

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

## 11.5 Version 2.5: Uploads in any format and whole-chapter lessons (plan update 2026-10-04)

A short version between V2 and V3. All existing rules apply (step protocol with "✅ Check this" and confirmation, zero cost, accuracy rules, pausing and resuming). Both features are data-driven, so they work unchanged for every subject V3 adds.

### 11.5.1 Feature A: uploads in any common file format

1. **Formats:** PDF (kept); PowerPoint `.pptx`/`.ppsx` (slide text in order, titles, speaker notes, tables); Word `.docx` (headings, paragraphs, lists, tables); `.xlsx` and `.csv` (tables); `.txt`, `.md`, `.rtf`; images `.png`/`.jpg`/`.jpeg`/`.webp`; scanned PDFs and picture-only slides; OpenDocument `.odt`/`.odp`. Old binary `.ppt`/`.doc`/`.xls` are detected and get a friendly "save it as .pptx/.docx or PDF" message with a two-line how-to.
2. **Read on the device, for free:** every format is parsed in the browser and lazy-loaded per type; files never go to our server or Firebase Storage. Office and OpenDocument files are ZIP archives of XML, read with a small unzip library (fflate, MIT) and our own XML reader; PDF with PDF.js. Each library's licence is checked.
3. **Text in pictures:** "Read text from images" runs in-browser OCR (Tesseract.js, Apache-2.0) with progress. Optional better quality: read one page with Gemini image input, labelled as using AI quota, never automatic for a whole file.
4. **Thin extraction:** a slide or page with almost no text is marked "content is in an image" in the preview (never silently skipped), with the OCR option.
5. **One normalised format:** file → sections (slide, page, heading, sheet) → text blocks, each with its position, so citations read "from your notes: Unit 3.pptx, slide 14".
6. **Preview before use:** per slide or page, collapsible; the student can remove irrelevant parts.
7. **Upload experience:** drag-and-drop and picker, several files and mixed formats at once; each file has a type (Notes / Slides / Previous-year paper / Worksheet / Syllabus), auto-guessed and editable, and a subject (optionally a chapter); size and page/slide caps with clear messages and warnings instead of crashes; friendly errors for password-protected, corrupted or unsupported files; a "My materials" page per subject (list, preview, re-tag, delete).
8. Everything built on uploads (grounded lessons, "from your notes" badges, PYQ pattern analysis, mock tests) works the same for every format. Storage rule unchanged: originals and full text stay on the device; only file names and short summaries sync.

### 11.5.2 Feature B: study a whole chapter in one lesson

1. **Selecting:** "Study the whole chapter" on each chapter, and checkboxes (with "select all") for a custom multi-topic lesson. The level applies to the whole lesson.
2. **Three time options** (Quick / Standard / Thorough, one marked Recommended) computed per chapter and level from a **chapter load score**: number of topics; syllabus teaching hours or marks when the data has them; how often (and for how many marks) the chapter appears in the student's uploaded previous-year papers; difficulty and how numerical or derivation-heavy it is; number of prerequisites; how much uploaded material covers it. Adjusted for the student: level, topics already completed, weak topics. Starting points for a first-time lesson: small 20/30/45, medium 30/45/60, large 45/60/90 min; revision levels scale down (e.g. 10/15/20); tuned in testing. If Thorough would exceed 90 minutes, offer Part 1 and Part 2 split at a natural break.
3. **Honest weightage:** never invent a weightage figure. A "Why these timings?" note lists only the factors actually used (e.g. "7 topics · 8 syllabus hours · appears in 4 of your 5 uploaded papers"); with no papers or syllabus marks it says the estimate uses chapter size and difficulty only and suggests uploading papers.
4. **Time inside the chapter:** split by importance, not equally (more for high-weight and difficult topics, a brief recap for completed ones). The plan (topics with minutes) is shown before generating; the student can adjust or skip topics while the total stays within the option. Exam Prep and Last-Minute order by exam importance; learning levels order by prerequisites.
5. **Building it:** chapter introduction (why it matters, chapter map) → topic sections in order with short bridges → wrap-up. Verified topic lessons from the shared library are reused (resized to the allotted minutes); only missing topics are generated. Outline first, then one topic at a time, streamed: the student starts on topic 1 while the rest generate, with a progress indicator. Every topic still goes through grounding and the verifier pass.
6. **Chapter extras:** concept map, combined mixed-topic quiz, one revision sheet, formula list, and a chapter mock test. One continuous audio lesson with a chapter per topic, generated in chunks, resume position saved. Chapter-level parts (intro, bridges, wrap-up, map) are cached in the shared library keyed by chapter, level and duration; lessons from private uploads stay private.
7. **Reading a long lesson:** sticky table of contents (topic, minutes, ticks), progress bar, time remaining, "Continue where you left off", "Take a break" markers, jump to any topic without regenerating, "Open this topic as its own lesson". Finishing marks topics as studied, updates weak topics from the combined quiz, and feeds flashcards, highlights and comments like single-topic lessons.

### 11.5.3 Steps

1. Multi-format parsers and the normalised extracted-text format
2. Upload experience, preview, "My materials" page, OCR option
3. Chapter and multi-topic selection, chapter load score, three time options with the "Why these timings?" note
4. Chapter lesson composition, chunked generation and streaming, library reuse
5. Long-lesson reading features, chapter audio, chapter extras (incl. the chapter mock test generator, moved here from V3 · Step 3), regression eval on both existing subjects, deploy

**Done when:** a student uploads a mix of `.pptx`, `.docx`, PDF and a photo of notes, sees what Prism read from each, and gets lessons citing "Unit 3.pptx, slide 14"; and picks a whole chapter in E&M or Engineering Maths, chooses one of three honest time options, starts reading while later topics generate, plays the audio, closes the tab and resumes at the same place.

## 11.6 Subject concept map fix (plan update 2026-10-04, done before V3 · Step 5)

The subject-level concept map must make "what comes before this topic, in what order" obvious.

1. **Hover, focus and pin:** hovering, focusing (Tab, arrow keys) or tapping a topic highlights it, every topic before it (all the way back) and the arrows between them, numbered 1, 2, 3… in a valid study order ending at the topic; everything else fades. Click/tap pins it; a second click/tap opens the topic; Esc or a click on empty space clears it.
2. **Side panel:** "Before this topic, study these in order" with ticks for topics already done, "Start with the first unfinished one", "Study this whole path" (one multi-topic lesson per chapter on the path), and, in a lighter style, "This topic unlocks".
3. **Less clutter:** columns by prerequisite depth (left to right; top to bottom on phones) so arrows flow one way; a shaded, labelled band per chapter that can be collapsed into one box; redundant arrows (A → C when A → B → C) removed; topics in a column ordered to reduce crossings; thin muted lines; fixed spacing so labels never overlap; zoom, pan, fit to screen and search; status colours with a legend, distinct from the highlight.
4. **Technical:** drawn with the app's own HTML/SVG layout (no new library needed); links come only from the subject data files; each subject's graph is validated (no cycles, no missing topics) and problems are reported instead of a broken map. Works for every subject including custom ones, 100+ topics, dark/light, 375px and reduced motion.

## 12. Version 3: All Engineering (plan update 2026-10-03)

V3 adds **syllabus breadth, not new features**: the major subjects of every B.Tech/BE branch commonly taught in India. Every feature up to V2.5 must work for every new subject exactly as today (6 levels, audio, interactive and static visuals, uploads and PYQ mode, flashcards, mock tests, weak-topic tracking, backlog planner, highlights and comments, accounts and sync, shared lesson library, export and backup).

### 12.1 Syllabus coverage

- **Wave 1 — first-year common core (9 subjects):** Engineering Mathematics (fill missing chapters); Applied / Engineering Physics, complete (mechanics, oscillations and waves, optics, lasers and fibre optics, quantum and modern physics, solid state and semiconductor physics, thermodynamics, plus the existing Electricity & Magnetism, linked rather than copied); Engineering Chemistry; Basic Electrical Engineering; Basic Electronics; Engineering Mechanics; Engineering Graphics; Programming for Problem Solving (C and Python); Environmental Science.
- **Wave 2 — CE, IT, ICT, ECE (21):** Data Structures and Algorithms, Object-Oriented Programming, DBMS, Operating Systems, Computer Networks, Computer Organisation and Architecture, Discrete Mathematics, Theory of Computation, Compiler Design, Software Engineering, Web Technologies, AI and ML basics; Digital Logic Design, Signals and Systems, Network Theory, Analog Electronics, Communication Systems, Digital Signal Processing, Microprocessors and Microcontrollers, Electromagnetic Theory, VLSI basics.
- **Wave 3 — Electrical, Mechanical, Civil (21 unique; Circuit Theory = Network Theory):** Electrical: Circuit Theory, Electrical Machines, Power Systems, Power Electronics, Control Systems, Electrical Measurements. Mechanical: Engineering Thermodynamics, Fluid Mechanics, Strength of Materials, Theory of Machines, Machine Design, Manufacturing Processes, Heat Transfer, Engineering Materials. Civil: Structural Analysis, Surveying, Geotechnical Engineering, Concrete Technology and RCC Design, Hydraulics, Transportation Engineering, Environmental Engineering, Building Materials.
- **Wave 4 — Chemical, Petroleum, others:** Chemical: Process Calculations, Fluid Flow Operations, Heat Transfer (shared), Mass Transfer, Chemical Reaction Engineering, Chemical Engineering Thermodynamics, Process Control. Petroleum: Petroleum Geology, Drilling Engineering, Reservoir Engineering, Production Engineering, Well Logging, Refining. Others (Aerospace, Automobile, Biotechnology, Instrumentation, Metallurgy, Mining and similar): core subjects of each at `sourced` tier.

**Syllabus rules:** (1) never written from memory: chapters and topics follow the AICTE Model Curriculum and openly available university syllabi, and each subject file records its syllabus source; no reliable syllabus → say so and mark it `limited`. (2) One subject, many branches: a shared subject is stored once and linked to every branch that uses it. (3) Data, not code: each subject is a file in `src/data/subjects/` with id, name, branches, typical semester, chapters, topics, prerequisites, syllabus source, trust tier, preferred visual set and grounding sources, plus teaching hours and marks per unit wherever the syllabus source gives them (the V2.5 chapter time estimate uses them); adding a subject needs no code change. (4) **My own syllabus** (pulled forward from V-Final; reading the file in any format is built in V2.5): a student pastes or uploads their university syllabus; Prism matches it to built-in topics and shows extra or missing topics.

### 12.2 Navigation for a large syllabus

Picker: **Branch → Year/Semester → Subject → Chapter → Topic**, plus one search box for any subject or topic. "My branch and semester" is saved in the profile (synced), so the home page shows the student's subjects first. A subject page shows chapters, progress, weak topics and the trust badge. Planner, mock tests, flashcards and progress tracker work across many subjects.

### 12.3 Accuracy for new subjects (85–90%)

1. Nothing that passes may drop: a `verified` subject stays at its ≥ 95% gate.
2. New tier **`tested`**: ≥ 85% on the subject's own golden set (90% target); ≥ 95% promotes to `verified`. The public accuracy page shows the real score, never rounded up.
3. Tier order: `verified` (≥ 95%) → `tested` (≥ 85%) → `sourced` (grounded, not yet tested) → `limited` (weak sources). `tested` behaves like `verified` (topic-matched widgets and PhET allowed).
4. Golden sets at scale: each `tested` subject needs ≥ 12 topics with key facts **taken from fetched trusted text** (NPTEL, OpenStax, LibreTexts, Wikipedia, MIT OCW, standard open textbooks). Each fact stores its source URL and the exact quote it came from, and a script checks the quote appears in that source. Never from a model's memory (Claude included). Three sample entries per subject are shown to the user before its eval runs.
5. A subject below 85% stays `sourced`, with what went wrong recorded in `EVAL_LOG.md`; no endless tuning for one subject.
6. All earlier rules stay (§6.1): no source no claim, verifier pass, arithmetic in code, regression eval on every passing subject after any prompt/schema/retrieval change; nothing ships if a passing subject drops below its gate.
7. **Numerical subjects** (mechanics, circuits, thermodynamics, strength of materials, fluid mechanics…): worked examples and mock-test numericals are solved in code (mathjs) with unit checking; a mismatch with the stated answer blocks the lesson.
8. **Programming subjects:** every code sample is run or statically checked before it is shown (JavaScript in a sandboxed worker, Python in Pyodide, C compile-checked via a free compiler service or a WebAssembly interpreter, else labelled "not executed"); expected outputs come from actually running the code.
9. Grounding sources add NPTEL course pages and transcripts where openly available, LibreTexts and MIT OpenCourseWare; NPTEL lectures are recommended first in "Keep learning".

### 12.4 Visuals for every engineering subject

The generic toolkit everywhere (§4.1), plus: (1) pulled forward from V-Final: computer-science visualisers (sorting, searching, trees, graphs, stacks/queues, recursion, logic gates and truth tables, memory diagrams), molecules (from PubChem identifiers) and reaction-energy diagrams for chemistry, maps only where a subject needs them; (2) a preferred visual set per subject (circuits → circuit diagrams with live values, waveforms, Bode and phasor plots; mechanics and strength of materials → free-body, shear-force and bending-moment diagrams, stress-strain curves; thermodynamics and heat transfer → P-V and T-s diagrams, cycle animations; fluids → flow profiles, pipe-flow and Bernoulli explorers; signals and control → time/frequency plots, block diagrams, step response; DSA → step-through visualisers; DBMS and OS → ER diagrams, query walk-throughs, scheduling Gantt charts, page-replacement step-throughs; civil and petroleum → labelled cross-sections, process flow diagrams, sourced images); (3) 3–4 new hand-coded widgets per Wave 1 and Wave 2 core subject, each listing its exact topics; (4) PhET map extended across physics, chemistry and maths; (5) all earlier visual rules stay, and every new visual type appears in `/dev/visuals`.

### 12.5 Staying free at this scale

Lessons are generated on demand (first request → verified → shared library), never in bulk. Evals run one subject at a time with rate limiting and resume, spread over days, and reuse cached eval lessons. Syllabus data ships with the app as static files (not Firestore). Any step that would need a paid service stops and asks, with a free alternative.

### 12.6 Steps

1. Restructure the plan (versions in SPEC.md and PROGRESS.md; old V3 → V-Final; this V3)
2. Subject data model and loader: branches and semesters, shared subjects, migration of E&M and Engineering Maths with no loss of saved progress
3. New navigation: branch → semester → subject → chapter → topic picker, search, subject pages, "my branch" setting; mock tests spanning several chapters or subjects (built on the V2.5 chapter mock test generator)
4. **Other subjects** (non-core courses, §12.8): custom subjects with optional topics, syllabus and material, outline built from material, theory-style lessons and answer-writing help
5. Accuracy scaffolding: `tested` tier, golden-set format with sources and quote checks, eval runner with rate limiting and resume, numerical and code checking
6. Wave 1 syllabus and grounding, including complete Applied Physics
7. Wave 1 visuals and widgets, then Wave 1 eval (Wave 1 must reach `tested` before moving on)
8. Wave 2 syllabus, visuals, eval
9. Wave 3 syllabus, visuals, eval
10. Wave 4 syllabus, visuals, eval (other branches at `sourced`)
11. My-own-syllabus matching (file reading built in V2.5), full regression eval, performance check, accuracy page update, deploy

Each wave ships on its own and is deployed, so the live site is always working and honest.

**Done when:** a student from any major B.Tech/BE branch can pick their branch and semester, open a core subject and get an accurate, visual lesson with audio, mock tests and all V2 features; every Wave 1–3 subject shows `tested` or `verified` with its real score; and E&M and Engineering Maths pass their gate (≥ 95% for `verified`).

### 12.7 Pausing and resuming

A "Current state" block at the top of PROGRESS.md is updated after every meaningful unit of work (version and step, sub-task, what is finished, what is half-done and where, the exact next action, any running command). Small `wip:` commits inside a step; the repo never sits broken between commits (half-built work stays behind a flag or out of the build). Network operations retry with increasing waits before stopping cleanly. On a new session or "continue": read PROGRESS.md and SPEC.md, `git status`, `git log -5`, check the build, say in 2–3 lines where we are, resume the recorded next action. Long-running scripts (eval, loaders) save progress after each item, detect 429/quota and network errors, wait (honouring retry-after, pausing until the daily reset if needed) and resume without redoing finished items or spending quota twice.

### 12.8 Other subjects (plan update 2026-10-04)

Non-core courses of the early semesters (Indian Knowledge System, Environmental Science, Universal Human Values, Organisational Behaviour, English Communication and similar) differ a lot between universities, so they get their own section instead of a built-in syllabus.

1. **Entry point:** an "Other subjects" section on the home page and in the subject picker, next to the branch and semester picker. One-tap name suggestions (Indian Knowledge System, Environmental Science, Universal Human Values, Organisational Behaviour, English Communication, Constitution of India, Professional Ethics, Economics for Engineers, Principles of Management) plus "Add my own subject". Suggestions fill in the name only; they bring no built-in syllabus.
2. **Setup form:** subject name (required); units/chapters and topic names (optional: type, paste the syllabus, or upload the syllabus file); material (optional but encouraged: slides, notes, previous-year papers, worksheets in any V2.5 format); other optional details (exam date, exam pattern: marks per question, theory or MCQ, internal or end-semester; units in the next exam; semester; language of instruction). At least one of topics, syllabus or material is required; otherwise ask for one in a friendly way instead of generating a generic lesson.
3. **Building the subject:** given topics are the structure, and uploaded material is matched to each topic. Without topics, a proposed outline (units → topics) is built from the material and previous-year papers, labelled "Outline built from your material", and the student can edit, reorder, rename, merge or delete topics before saving. With only a name and a few topics, lessons are grounded in trusted free sources and the subject is `sourced` or `limited` per the accuracy rules, with a prompt to upload material. Uploaded faculty material is the first source and is labelled; disagreements show both. Previous-year papers drive exam emphasis (frequent topics, typical question types).
4. **Lessons:** single topic, several topics or a whole unit, then level and length, with audio for the same length; whole units use the V2.5 Quick / Standard / Thorough options and "Why these timings?". Every existing feature works unchanged. Theory style: prefer mind maps, timelines, comparison tables, flowcharts and labelled images; Exam Prep adds answer-writing help (model answers sized for 2, 5 and 10 marks, examiner key points, structure of a long answer); mock tests include descriptive questions with a self-check list. Skill subjects (English Communication) include practice activities (grammar and vocabulary exercises, letter, email and report formats with examples).
5. **Storage and privacy:** a custom subject belongs to its student: local-first storage, synced to their own account (structure, progress, small data; originals and full text stay on the device). Lessons from private uploads never go to the shared library. "My subjects" lists custom subjects next to the engineering ones with edit, duplicate and delete, and they are part of export/import backup. Environmental Science stays in the Wave 1 built-in list too.

## 13. Version Final: Universal (formerly V3; may become V4 or V5)

Unchanged from the old V3 except what V2.5 and V3 pulled forward (syllabus upload, mock tests, the computer-science and chemistry toolkit items and maps where needed):

1. Free-text topic input for any subject · 2. Subject-type routing (templates + preferred visual sets per field; generic toolkit part 2 items still open: §4.1 items 2, 6, 11, 14 and maps beyond engineering; high-stakes notes and the `limited` tier, §6.1 rule 9) · 3. Papers (arXiv/OpenAlex) and curated lectures · 4. Ask-a-doubt chat · 5. Adaptive learning · 6. Focus mode, Pomodoro (streaks already done in V2) · 7. Shareable lesson links (library lesson IDs) + "report a mistake" flags sent to Firestore via a server route, with the feedback loop of §6.1 rule 11 · 8. Hindi/Gujarati, PWA, accessibility · 9. Hardening: rate limits, BYO key, analytics, Lighthouse 90+, multi-subject eval, README + demo, launch checklist

**Done when:** law, engineering and commerce students each get an accurate, sourced, visual lesson with audio, and the eval is ≥ 95% on the multi-subject golden set.
