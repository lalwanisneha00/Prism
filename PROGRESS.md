# Progress

Update this after every step so any person or AI tool can pick up the work.

**Current:** V2 · Step 4 (PDF upload). User approved autonomous build through the end of V2 (2026-10-02).

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
| 4    | PDF upload + retrieval                       | ⬜ Not started |
| 5    | PYQ / worksheet mode                         | ⬜ Not started |
| 6    | Engineering Mathematics + visuals part 2     | ⬜ Not started |
| 7    | Interaction tools                            | ⬜ Not started |
| 8    | Prerequisite concept map                     | ⬜ Not started |
| 9    | Flashcards + spaced repetition               | ⬜ Not started |
| 10   | Backlog planner & progress tracker           | ⬜ Not started |
| 11   | Export & eval                                | ⬜ Not started |

When V2 · Step 1 starts: give the user click-by-click Firebase console setup (Spark project, Google sign-in, Firestore database, web config, service account key, authorized domains).

## Plan changes

- **2026-10-01: Accounts & cloud sync added** (SPEC §9). New V2 · Step 1: Firebase Spark (no billing, no Firebase Storage), Google sign-in only, local-first IndexedDB + Firestore outbox sync, a shared server-written lesson library (replaces the old "caching" item from V3 · Step 10), quota fallback and a study dashboard. The old V2 steps shift down one (now 11 steps). V3 · Step 8 Supabase sync is replaced by share links and mistake reports sent to Firestore. V1 is unchanged except Step 10 makes storage records sync-ready.

## V2 · Step 1 notes

- Firebase project `prism-study-7faa5` (Spark). Rules in `firestore.rules`, published manually (the Admin key cannot publish rules). `npm run test:firebase` passed 18/18 live checks on 2026-10-02.
- Sign-out clears the device copy (privacy on shared devices); a different account signing in also clears it first. Guest data merges into the first account.
- Firebase Analytics was enabled on the project but the app never loads it.

## Known issues / leftovers

- Windows: `npm test` goes through `scripts/vitest.mjs`, which fixes a lowercase drive letter (c:\) that otherwise breaks every test.

- Dev tip: if the page looks stuck on old styles, check `about:debugging#/runtime/this-firefox` for a stale service worker on `localhost:3000` (the separate "Register" project installs one there). Its cache-first rule serves outdated `/_next/static` files in dev mode.

## V1 status for the next session

- Live deploy: not done yet. Needs the user's Vercel login (steps in README → "Put it online").
- `npm run eval`: harness verified with `-- --fake`. Real accuracy number still to be measured once GEMINI_API_KEY is set; prompts may need tuning to reach ≥ 95%.
- Real Gemini calls have only been tested with a mocked network and an invalid key; the first real lesson should be checked by eye.
- Not in V1 by design: "report a mistake" button (§6.6), sleep timer and watch-along audio (V2), 30–90 min audio (V2).
