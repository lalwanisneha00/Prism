# Prism

A visual, sourced study guide for college students. Pick a topic and a learning level, then get a clear explanation, interactive visuals, an audio lesson, worked examples and a quiz.

> Work in progress. See [SPEC.md](SPEC.md) for the plan and [PROGRESS.md](PROGRESS.md) for status.

## Run locally

Requires Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env.local   # add your free Gemini key (needed from V1 · Step 6)
npm run dev                  # http://localhost:3000
```

## Scripts

- `npm run check`: typecheck, lint, format check and tests
- `npm run build`: production build
- `npm run format`: auto-format the code
