# Morning report: overnight run (V2.5, then V3)

Newest status at the top. Branch: `overnight-v2.5-v3` (nothing was merged into `main`).

## Summary

- **Finished:** V2.5 · Step 1 (before tonight).
- **In progress:** V2.5 · Step 2 (upload experience, preview, "My materials", OCR).
- **Not started:** V2.5 · Steps 3–5, V3 · Steps 2–11.

## How to see it

- Branch: `overnight-v2.5-v3` (pushed to GitHub; Vercel builds a preview for it if the project is linked to the repo).
- Locally: `git checkout overnight-v2.5-v3`, `npm install`, `npm run dev`, open http://localhost:3000.
- Automated checks: `npm run check`, `npm run build`, `npm run test:e2e` (Playwright, uses the fake AI, no quota).

## Finished steps and "✅ Check this"

(Filled in as steps finish.)

## Decisions made without you

- Plan: "Other subjects" is V3 · Step 4; later V3 steps are renumbered 5–11 (SPEC §12.6, §12.8).

## Needs Sneha

(Nothing yet.)

## Problems

(None yet.)

## Accuracy

- Last measured (2026-10-03): Electricity & Magnetism 83.2% (re-scored), Engineering Maths 88.5%. Both shown as "sourced". Regression eval to re-run when quota allows.

## Pauses

- 2026-10-04 02:36: run started.

## Next action

Build V2.5 · Step 2.
