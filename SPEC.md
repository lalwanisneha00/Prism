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
4. Lesson schema: Zod schema, types, hand-written sample lesson
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
9. Flashcards + spaced repetition (synced)
10. Backlog planner + progress tracker (synced)
11. PDF export, 40-topic golden set, ≥ 95%

**Done when:** signing in with Google on a laptop and a phone shows the same progress; upload a college PDF → lesson follows it; 45-min audio; flashcards; 7-day backlog plan.

## 12. Version 3: Universal & final

1. Free-text topic input + syllabus parsing · 2. Subject-type routing (templates + visual sets per field) · 3. Papers (arXiv/OpenAlex) and curated lectures · 4. Ask-a-doubt chat · 5. Adaptive learning · 6. Mock tests (results synced) · 7. Focus mode, Pomodoro, streaks · 8. Shareable lesson links (library lesson IDs) + "report a mistake" flags sent to Firestore via a server route · 9. Hindi/Gujarati, PWA, accessibility · 10. Hardening: rate limits, BYO key, analytics, Lighthouse 90+, multi-subject eval, README + demo, launch checklist

**Done when:** law, engineering and commerce students each get an accurate, sourced, visual lesson with audio, and the eval is ≥ 95% on the multi-subject golden set.
