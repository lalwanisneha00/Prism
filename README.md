# Prism

A visual, sourced study guide for college students. Pick a topic, how well you know it and how much time you have, and get a lesson with interactive physics visuals, worked examples, a quiz, a revision sheet, an audio narration and a source for every claim.

**Version 1** teaches Electricity & Magnetism (43 topics, 7 chapters) at three levels: First Encounter, Second Chance and Last-Minute Revision. **Version 2** (in progress) adds Engineering Mathematics (44 topics), all six levels, accounts with cloud sync, long audio, lessons from your own PDF notes and exam worksheets. See [SPEC.md](SPEC.md) for the full plan and [PROGRESS.md](PROGRESS.md) for status.

## What's inside

| Feature  | How it works                                                                                                                                                                                                                                                                        |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lessons  | Gemini writes structured JSON; Zod checks it; broken replies are sent back with the problems (up to 3 tries). Groq is the fallback when Gemini's free quota is busy.                                                                                                                |
| Accuracy | Facts are grounded in Wikipedia text fetched on the server; the AI may only cite verified OpenStax/Wikipedia sources; every formula must typeset; a second fact-check pass recomputes examples. Sections show **Sourced ✓** or **Verify ⚠**.                                        |
| Visuals  | 8 hand-coded, unit-tested widgets (field lines, Coulomb force, Gauss surface, capacitor, wire field, Faraday induction, DC circuit, AC wave), 11 PhET simulations, safe graphs, Mermaid diagrams and Wikimedia images. The AI only chooses from this list. Gallery: `/dev/visuals`. |
| Audio    | Narration written chapter by chapter to fill 5, 10 or 15 minutes (≈140 words/min), read by the browser's built-in voice with ±15 s, speed, voice choice, chapters, highlighted transcript and resume.                                                                               |
| Library  | Save lessons on the device (IndexedDB); they reopen instantly and offline without using AI quota. Recent topics on the home page.                                                                                                                                                   |

## Run it on your computer

Requires Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env.local   # then paste your Gemini key into .env.local
npm run dev                  # http://localhost:3000
```

Get a free Gemini key at https://aistudio.google.com/apikey and set `GEMINI_API_KEY=` in `.env.local`. Without a key the app still runs: the Gauss's law First Encounter lesson is built in, and other topics show a friendly "AI isn't switched on yet" message. For offline testing, `LLM_PROVIDER=fake` streams a canned lesson.

## Put it online (Vercel, free)

1. Sign in at https://vercel.com with your GitHub account.
2. **Add New → Project**, choose the `Prism` repository, and click **Import**.
3. Open **Environment Variables** and add `GEMINI_API_KEY` with your key (optionally `GROQ_API_KEY` too). Do **not** add `LLM_PROVIDER`.
4. Click **Deploy**. After about a minute you get a live URL like `https://prism-xxxx.vercel.app`.
5. Every `git push` to `main` redeploys automatically.

## Scripts

| Command          | What it does                                                                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`    | Development server                                                                                                                                 |
| `npm run check`  | Typecheck, lint, format check and all tests                                                                                                        |
| `npm run build`  | Production build                                                                                                                                   |
| `npm run eval`   | Accuracy eval: writes a lesson for each of the 15 golden-set topics and reports the % of key facts stated (needs a key; `-- --fake` for a dry run) |
| `npm run format` | Auto-format the code                                                                                                                               |

## Credits

Simulations: [PhET Interactive Simulations](https://phet.colorado.edu), University of Colorado Boulder, CC BY 4.0. Textbook sections: [OpenStax University Physics Volume 2](https://openstax.org/details/books/university-physics-volume-2), CC BY 4.0. Encyclopedia text and images: Wikipedia and Wikimedia Commons contributors, licences shown beside each image.
