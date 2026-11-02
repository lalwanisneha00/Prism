# HANDOFF: how to continue Prism

Written for a new AI (or person) picking this repo up cold. Last updated 2026-11-01.

**Read in this order:** `CLAUDE.md` (rules), then the "Current state" block at the top of `PROGRESS.md` (where we are and what is next). For syllabus work also read `docs/SYLLABUS_AUDIT.md` (Progress Log at the bottom) and only the needed phase of `PRISM_SYLLABUS_FIX.md`. `SPEC.md` is the product spec; `docs/SYLLABUS_SYSTEM.md` explains the syllabus system in plain English. Don't re-read the whole codebase: read what the current task needs.

## 1. What Prism is

A free, visual, sourced study guide for B.Tech students at PDEU (Pandit Deendayal Energy University). Next.js 16, React 19, Tailwind 4, TypeScript strict, Zod, Firebase Spark (free plan), Vercel (free plan). A student picks branch → semester → subject → chapter → topic, a level (six) and a length, and gets an AI lesson grounded in fetched sources, fact-checked and code-checked, with visuals the AI can only choose from a trusted registry. Also: lab lessons (11 lab formats, circuit renderer, simulations), mock tests, weak-topic tracking, planner, flashcards, uploads in any format, audio, highlights and comments, slides/PDF export, accounts and sync, and student syllabus flagging with voting and an admin page.

The owner is **Sneha**, a first-year student: explain simply, with an everyday analogy for new ideas. Don't use gendered pronouns for anyone unless stated.

## 2. How we work now (owner's rules, 2026-11-01)

- Work in phases. At the end of each phase: run `npm run check` and `npm run build`, explain what changed, then **ask before committing**. Commit and push only when the owner says so.
- Before each commit, update `PROGRESS.md` (and `docs/SYLLABUS_AUDIT.md` for syllabus work, `CLAUDE.md` if needed) so a fresh session can resume.
- Must stay completely free: no paid APIs or services; flag anything that would need payment first.
- Don't remove or break existing features. No big refactors, dependency upgrades or file deletions without asking.
- Accuracy target for engineering-wide content: 85 to 90%. Don't trade accuracy for speed.
- Never commit `.env*` files or secrets. The owner is on Windows 11: give terminal commands for PowerShell.
- Older notes in `PROGRESS.md` and `MORNING_REPORT.md` describe an "autonomous, never ask" mode and a branch `overnight-v3-final`. **Both are history.** Work happens on `main` now, and the owner confirms each phase.

## 3. Where everything is

- Repo: `github.com/lalwanisneha00/Prism`, branch **`main`**. Every push to `main` deploys to Vercel production.
- **Live site design: every student uses their own AI key** (Settings → Your API keys). Vercel has no `GEMINI_API_KEY`/`GROQ_API_KEY` on purpose; those in `.env.local` are only for local development. Every browser call to an AI route must go through `apiFetch` (`src/lib/byok/apiFetch.ts`) so the student's key goes along.
- Syllabus data: `src/data/subjects/pdeu-*.json` (about 490 active courses incl. 147 labs, ~16,400 topics, 9 branches in `src/data/branches.json`: ce, ict, ece, me, civil, petro, biotech, elec, chem). Older non-PDEU subject files are a hidden topic bank. Never rebuild the syllabus; change it with reversible migrations in `scripts/syllabus-migrations/` (001 to 012).
- Student fixes live in Firestore (`syllabusOverlay/current` and friends, server-only); admin page `/admin/syllabus` (account in `ADMIN_UID`). `/api/status` says (yes/no) whether database access is set up.
- Feature flags: `src/lib/flags.ts` (see `DEPLOY_CHECKLIST.md`).
- Tags: `v2.5-step-N`, `v3-step-2…7`, `v3-step-11`, `final-feature-a/b/c`, `final-polish`, `final-semester-syllabus`, `pre-syllabus-*` (before syllabus migrations).
- Local-only branch `backup/syllabus-phase5-plus-6`: an old work-in-progress backup, not needed (delete only if the owner says so).

## 4. State of the work

| Area                               | State                                                                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| V1, V2, V2.5                       | Done.                                                                                                                                            |
| V3 (All Engineering)               | Built. Steps 8 to 10 evals were paused by the owner, and are now outdated anyway (see below).                                                    |
| Final features A, B, C             | Done: own API key, slides + PDF, redesign. Themes (SPEC §11.15): 8 themes on /themes (Prism default, Classic, 6 newer).                          |
| Feature D (community branches)     | Not started by decision; flag `community` off. Spec: `docs/PRISM_OVERNIGHT_FINAL.md` §7.                                                         |
| PDEU syllabus + syllabus fix (0-8) | Done and live, incl. 4B, 7B, 7C and migration 012 (merged lab numbering). Student flagging tested by the owner on the live site with 4 accounts. |
| Accuracy evals                     | **Outdated** (run on the old syllabus). Don't run or change them until the owner asks for a separate eval task.                                  |
| V-Final                            | Not started.                                                                                                                                     |

Open items: `YOUTUBE_API_KEY` not set (lab videos off; free key, no billing); unclear handout re-check suggestions not applied (`handouts/_parsed/RECHECK_REPORT.md`); some UI text still mentions "Prism's shared key" (`KeyIndicator`, `ApiKeys`, `LessonError`), which doesn't match the own-key design.

## 5. How to run and verify (PowerShell)

```powershell
npm install
npm run dev              # http://localhost:3000
npm run check            # typecheck + lint + format check + all Vitest tests (1090 at last run)
npm run build            # production build
$env:E2E_SERVER = "start"; npx playwright test e2e/navigation.spec.ts --project=desktop-light
```

- Playwright uses the installed Edge (`channel: msedge`), one worker, port 3210, fake AI. With `E2E_SERVER=start` it serves the existing production build (run `npm run build` first), which needs far less memory than the dev server. Projects: `desktop-light`, `desktop-dark`, `mobile-light`, `mobile-dark` (375px).
- Known flaky unit test: `src/app/api/lesson/route.test.ts` "explains when no AI key is configured" can time out (5 s) during the full run on this computer; it passes alone. Not a bug.
- If a killed run leaves port 3210 busy: `netstat -ano | findstr :3210`, then `taskkill /PID <pid> /F`.
- Run heavy commands one at a time (little free memory). A test that "took hours" usually failed because the computer slept; re-run it alone.

## 6. Environment quirks (learned the hard way)

- The AI tooling's Bash heredocs mangle backslashes and `\f \o \v \b`: write files with LaTeX, regexes or `\n` using the editor/Write tool.
- `src/lib/subjects.ts` is a file; don't create a `src/lib/subjects/` folder.
- `scripts/build-pdeu-layer.mjs` deletes and rebuilds all `pdeu-*.json`: it refuses to run without `--rebuild-from-scratch`. Never use it.
- After a script writes subject files: `npx prettier --write "src/data/subjects/pdeu-*.json"`, then `npm run syllabus:check`.
- If the dev site looks stale or unstyled in Firefox, the owner's other project "Register" may have left a service worker on `localhost:3000`; use another port (`npx next dev -p 3100`).
- `/dev/*` pages 404 on the live site; the fake-AI test server serves them.
- Don't run two `next dev` servers in one folder. Stop servers and browsers after tests. `.logs/` is git-ignored scratch.
- A Firebase admin key file (`*-firebase-adminsdk-*.json`) may sit in the project root for local use: git-ignored, never commit or print it.
- PowerPoint is installed for checking decks by eye (`New-Object -ComObject PowerPoint.Application`).

## 7. Honest caveats

- E&M (79.8%) and Engineering Maths (88.5%) last measured below the 95% `verified` gate; shown as "Sourced". All eval numbers predate the syllabus fix.
- Performance targets were not met (`PERF_REPORT.md`): most pages 3-4 s on a throttled phone, lesson page 9 s.
- Interactive widgets in slide pictures still show their slider controls.
- Needs the owner (an AI can't do it): Vercel and Firebase console settings, Firestore rule pastes, the YouTube key, decisions on evals and Feature D.
