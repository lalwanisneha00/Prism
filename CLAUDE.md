@AGENTS.md

# Prism: rules for AI coding assistants

Read `SPEC.md` (what we're building) and `PROGRESS.md` (where we are) before doing anything.

## Working protocol

- The project runs in versions (V1–V3), each split into numbered steps (see `SPEC.md`).
- Build **one step at a time**. Don't jump ahead or add unrequested features.
- Before handing a step over, run `npm run check` and `npm run build` and fix every failure.
- End each step with a "✅ Check this" block: command, URL, what to see, how to test, and one edge case. Then stop and wait for the user to confirm.
- After confirmation, commit (`V1 step N: <title>`) and update `PROGRESS.md`.
- The user is a first-year student: explain decisions simply, with an everyday analogy when a concept is new.

## Coding rules

- TypeScript strict. **No `any`** (ESLint enforces it). Use `unknown` and narrow it.
- Small components with one responsibility each.
- API keys live **only on the server** (route handlers / `src/lib/llm`). Never commit `.env.local`; document new variables in `.env.example`.
- Every AI response is validated with Zod. Never render unvalidated AI output as HTML.
- The AI never draws visuals. It picks from `src/visuals/registry.ts`, PhET, Mermaid (validated), plots, or Wikimedia images.
- Every external asset shows its licence and attribution (PhET, Wikimedia).
- Every screen handles **loading, empty, error, and rate-limit** states.
- Mobile-first; check every screen at 375px width.
- Subjects, levels and topic lists are **data** (JSON/config), not hard-coded logic.
- Pure logic goes in `src/lib` and gets a Vitest test (`*.test.ts` next to the file).
- Format with Prettier (`npm run format`); don't hand-fight the formatter.

## Commands

| Command                 | What it does                                                      |
| ----------------------- | ----------------------------------------------------------------- |
| `npm run dev`           | Start the local dev server at http://localhost:3000               |
| `npm run check`         | Typecheck + lint + format check + tests                           |
| `npm run build`         | Production build (must pass before handover)                      |
| `npm run format`        | Auto-format all files                                             |
| `npm test`              | Run Vitest once                                                   |
| `npm run eval`          | Golden-set accuracy eval (needs GEMINI_API_KEY)                   |
| `npm run test:firebase` | Live checks of Firestore rules and sync (needs Firebase settings) |

## Folder map

- `src/app`: pages and API routes (Next.js App Router)
- `src/components`: React UI components
- `src/lib`: logic, schemas, config (`llm/` = AI adapter, server-only)
- `src/visuals`: widget registry and hand-coded widgets
- `src/data/subjects`: subject/chapter/topic data
- `eval`: golden set and accuracy script
- `src/lib/storage`: IndexedDB (the main copy) · `src/lib/sync`: outbox sync engine + Firestore adapter
- `firestore.rules`: security rules (paste into Firebase console → Firestore → Rules when changed)
