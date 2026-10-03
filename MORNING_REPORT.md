# Morning report: overnight run (V2.5, then V3)

Newest status at the top. Branch: `overnight-v2.5-v3` (nothing was merged into `main`).

## Summary

- **Finished:** V2.5 · Step 1 (before tonight), Step 2 (tag `v2.5-step-2`), Step 3 (tag `v2.5-step-3`).
- **In progress:** V2.5 · Step 4 (building the chapter lesson: composition, streaming, library reuse).
- **Not started:** V2.5 · Step 5, V3 · Steps 2–11.

## How to see it

- Branch: `overnight-v2.5-v3` (pushed to GitHub; Vercel builds a preview for it if the project is linked to the repo).
- Locally: `git checkout overnight-v2.5-v3`, `npm install`, `npm run dev`, open http://localhost:3000.
- Automated checks: `npm run check`, `npm run build`, `npm run test:e2e` (Playwright, uses the fake AI, no quota).

## Finished steps and "✅ Check this"

### V2.5 · Step 3: whole-chapter / several-topic selection and the three time options (tag `v2.5-step-3`)

**Built:** in the topic picker, after choosing a chapter: **One topic** (as before), **Study the whole chapter**, or **Choose topics** (checkboxes with "Select all"). For a chapter or several topics, the duration list is replaced by exactly three options computed for that chapter, level and student: **Quick / Standard / Thorough**, one marked **Recommended ★** and preselected. The estimate uses a load score from: number of topics, how much each topic builds on (prerequisite depth), syllabus teaching hours/marks when the subject data has them (none yet: V3 adds them), how many of the student's uploaded previous-year papers ask about these topics (and their marks), how much of their material covers it, topics already done well (short recap) and weak topics (more time). Revision levels scale down; anything over 90 minutes is offered as two parts. **"Why these timings?"** lists only the factors really used; with no papers or syllabus data it says the estimate is based on size and difficulty only and links to uploading papers. Never an invented weightage. Then a **plan page** (`/chapter`) shows each topic with its minutes (important/harder/weak topics get more, done topics a recap), ordered by prerequisites for learning levels and by importance for Exam Prep / Last-Minute; − / + and Skip keep the total equal to the chosen option; long lessons show "Part 2 starts here: take a break". The "Start the lesson" button leads to the chapter lesson built in Step 4.

Also fixed: the "Parsing CSS source code failed … ::highlight" warning on every page load (it was in your terminal earlier). The highlight colours are now added by the highlights code at runtime; a browser test confirms highlights are still painted and survive a reload.

**Tests:** 362 unit tests (new: load score, sizes, level scaling, two-part split, honest factor list, paper matching with marks, minute sharing that always adds up, recap/weak weighting, prerequisite vs importance order, adjusting/skipping keeps the total, split point, URL round-trip and validation). Playwright: 35 checks pass across desktop/375px × light/dark (whole chapter → options → plan adjust/skip; chosen topics with an uploaded paper changing the estimate; "tick topics first" message; broken link message; no sideways scrolling at 375px).

**✅ Check this**

- http://localhost:3000 → Electricity & Magnetism → chapter **Electrostatics** → **Study the whole chapter** → level **First Encounter**.
- You should see three options like "Quick · 45 min", "Standard · 60 min ★ (Recommended)", "Thorough · 90 min". Open **Why these timings?**: "8 topics · builds on up to N earlier topics" and the "size and difficulty only" note.
- Change the level to **Last-Minute Revision**: all three get shorter and Quick becomes recommended.
- Click **Build my lesson** → the plan: 8 topics with minutes. Press + on one topic and Skip on another: "Total: 60 of 60 min" stays.
- Upload `test-fixtures/PYQ-applied-physics-2024.txt` in My materials (Electricity & Magnetism), then choose **Choose topics** → Gauss's law + Electric dipole → Exam Prep: the note now says "appears in 1 of your 1 uploaded paper (… marks)".
- Edge case: choose **Deep Dive** for the whole chapter: Thorough is over 90 minutes and says "In 2 parts", and the plan shows "Part 2 starts here: take a break".

### V2.5 · Step 2: upload experience, preview, "My materials", OCR (tag `v2.5-step-2`)

**Built:** the Uploads page is now **My materials**: drag-and-drop or pick up to 20 files at once in mixed formats; each file is read on the device, then saved with a guessed type (Notes / Slides / Previous-year paper / Worksheet / Syllabus), the chosen subject and, when one clearly stands out, its chapter (all editable). Filter by subject. **Preview** shows every slide/page/heading part; untick "Use this part in lessons" to leave a part out. Parts whose content is in pictures can be read **on the device** (Tesseract.js OCR, free; downloads its language data once) or, one part at a time, **with the AI** (Gemini image input; uses quota; labelled). The original file is kept on the device (up to 15 MB) so pictures can be read later; only name, type, subject and a summary sync. Lessons use only the materials of the lesson's subject (plus untagged ones). The past-paper (PYQ) mode can load a saved previous-year paper.

**Tests:** 345 unit tests pass (new: type and chapter guessing, re-tag/leave-out/OCR storage, OCR text clean-up, image-capable AI chain). Playwright: 4 flows × desktop/375px × light/dark all pass (OCR runs once, on desktop light): multi-file upload with an old .ppt error, re-tag surviving reload, preview and leave a part out, subject filter, AI reading of a picture slide, on-device OCR of a photo, and a lesson citing "text-heavy-slides.pptx, slide N".

**✅ Check this**

- `npm run dev` → http://localhost:3000/notes
- Choose subject **Electricity & Magnetism**, then select several files from `test-fixtures/` at once (or drag them in): `text-heavy-slides.pptx`, `picture-heavy-slides.pptx`, `notes-with-tables.docx`, `old-format-slides.ppt`, `photo-of-board-notes.png`, `question-bank.xlsx`.
- You should see a status line per file: "6 slides · saved as Slides", "4 sections · saved as Notes", the old-.ppt message with the how-to, "1 image … 1 with content in pictures".
- Open **Preview** on the photo → **Read text from images** → after a progress bar, the part shows "Read from picture" and text like "Choose a surface with symmetry: sphere -> point charge" (handwriting-style fonts come out imperfect, e.g. "Gaunss's").
- Open **Preview** on the picture-heavy deck → slide 2 → **Read with AI (uses AI quota)** (real Gemini on your machine).
- Change a file's **Type** to "Previous-year paper", reload: it stays. In a lesson's Exam Prep → past papers, "or use a saved paper" lists it.
- Edge case: untick "Use this part in lessons" on a slide, then open a lesson with "Use my uploaded notes": that slide is never cited.

## Decisions made without you

- Plan: "Other subjects" is V3 · Step 4; later V3 steps are renumbered 5–11 (SPEC §12.6, §12.8).
- Browser tests use Playwright with the Edge already installed on Windows (no 150 MB browser download) and the fake AI.
- Office/OpenDocument files are read with fflate (MIT) and a small XML reader instead of mammoth/SheetJS (SheetJS's npm package is outdated); one reader handles all ZIP-based formats.
- The original uploaded file is kept on the device (≤ 15 MB, new local-only IndexedDB store, database version 7 adds it without touching existing data) so "Read text from images" can work later; larger files keep only their text.
- A file uploaded with "Any subject" is used for every subject's lessons; a file tagged with a subject only for that subject.
- OCR on the device downloads English language data from the free jsDelivr CDN on first use (the picture itself never leaves the device).
- Chapter time estimate: when the subject data has no syllabus hours (true for both current subjects), size comes from topic count and prerequisite depth; papers raise it by up to 25% when the chapter is often asked. Deep Dive is 1.2× the first-time times, Exam Prep 0.67×, Last-Minute 0.45×. "Completed" = latest quiz score ≥ 60%; "weak" = below 60% or marked "Didn't understand".
- Plan adjustments change a topic by 2 minutes per press (minimum 3 minutes per topic).

## Needs Sneha

- To use "Read with AI" on photos, nothing new is needed (it uses the existing `GEMINI_API_KEY`). Groq cannot read images, so if Gemini's quota is used up the button says so.

## Problems

- The overnight run stopped early at the Claude usage limit, during V2.5 · Step 4. "Start the lesson" on the chapter plan page leads to `/chapter/lesson`, which isn't built yet (404 for now).

## Accuracy

- Last measured (2026-10-03): Electricity & Magnetism 83.2% (re-scored), Engineering Maths 88.5%. Both shown as "sourced". Regression eval to re-run when quota allows.

## Pauses

- 2026-10-04 02:36: run started.
- Paused: Claude usage limit reached during V2.5 · Step 4 (server part done and committed as `wip:`; the `/chapter/lesson` page is next).

## Next action

Build V2.5 · Step 4 (chapter lesson: intro, topic sections with bridges, wrap-up; library reuse; generate topic by topic and stream).
