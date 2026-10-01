# Progress

Update this after every step so any person or AI tool can pick up the work.

**Current:** V1 · Step 4 (Lesson schema + topic search), in progress

## Version 1: Foundation

| Step | Title                  | Status         | Date       | Notes                                                                             |
| ---- | ---------------------- | -------------- | ---------- | --------------------------------------------------------------------------------- |
| 1    | Project setup          | ✅ Done        | 2026-10-02 | Next 16.3, Tailwind 4, ESLint 9 + Prettier, Vitest 5. Pushed to GitHub.           |
| 2    | Design system & layout | ✅ Done        | 2026-10-02 | Tokens in globals.css, data-theme dark mode, header, hero, footer.                |
| 3    | Topic picker           | ✅ Done        | 2026-10-02 | em.json (7 chapters, 43 topics), levels + durations config, /lesson summary page. |
| 4    | Lesson schema + search | 🟡 In progress | 2026-10-02 | + topic search box (user request)                                                 |
| 5    | Lesson page renderer   | ⬜ Not started |            |                                                                                   |
| 6    | AI integration         | ⬜ Not started |            |                                                                                   |
| 7    | Sources & grounding    | ⬜ Not started |            |                                                                                   |
| 8    | Visual library part 1  | ⬜ Not started |            |                                                                                   |
| 9    | Audio (read-aloud)     | ⬜ Not started |            |                                                                                   |
| 10   | Save, polish, deploy   | ⬜ Not started |            | Storage records must carry `id`, `updatedAt`, `deleted` (sync-ready).             |

## Version 2: Personal & powerful

| Step | Title                                        | Status         |
| ---- | -------------------------------------------- | -------------- |
| 1    | Accounts, cloud sync & shared lesson library | ⬜ Not started |
| 2    | All 6 levels                                 | ⬜ Not started |
| 3    | Long audio                                   | ⬜ Not started |
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

## Known issues / leftovers

- Dev tip: if the page looks stuck on old styles, check `about:debugging#/runtime/this-firefox` for a stale service worker on `localhost:3000` (the separate "Register" project installs one there). Its cache-first rule serves outdated `/_next/static` files in dev mode.
