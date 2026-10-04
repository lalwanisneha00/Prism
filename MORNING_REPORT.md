# Morning report: overnight run (V2.5, then V3)

Newest status at the top. Branch: `overnight-v2.5-v3` (nothing was merged into `main`).

## Summary

- **Finished:** **all of V2.5** (Steps 1–5; tags `v2.5-step-2` … `v2.5-step-5`).
- **In progress:** V3 · Step 2 (subject data model: branches, semesters, shared subjects).
- **Not started:** V3 · Steps 3–11.

## How to see it

- Branch: `overnight-v2.5-v3` (pushed to GitHub; Vercel builds a preview for it if the project is linked to the repo).
- Locally: `git checkout overnight-v2.5-v3`, `npm install`, `npm run dev`, open http://localhost:3000.
- Automated checks: `npm run check`, `npm run build`, `npm run test:e2e` (Playwright, uses the fake AI, no quota).

## Finished steps and "✅ Check this"

### V2.5 · Step 5: reading a long lesson, chapter audio, chapter extras, mock test (tag `v2.5-step-5`)

**Built (chapter lessons):**

- **Sticky reading bar**: "2 of 8 topics done · about 25 min left", a progress bar, and a drop-down of every topic with minutes and ✓ ticks; tap one to jump there.
- A topic is marked **finished** when you read to its end (saved on the device; the topic also goes to "Recent topics"). Your **reading position** is saved too: reopening shows "Continue where you left off: Gauss's law · Jump there". The dashboard has a **"Continue your chapter lesson"** card.
- **"☕ Good moment for a 5-minute break"** markers about every 25 minutes (between topics).
- **Concept map** of the lesson's topics (opens each as its own lesson).
- **Chapter audio**: "play the short version now" (each topic's built-in narration plus the intro, bridges and wrap-up, no AI), or "Create my N-minute chapter audio", written topic by topic through the existing audio service with a chapter per topic; you can listen while the rest is written, and the position is saved and synced.
- After the last topic: a **mixed quiz** (questions from every topic interleaved; each topic's score updates weak topics like a normal quiz), one **chapter revision sheet with all formulas** (no repeats), and the **chapter mock test**.
- Each topic has its own **Flashcards** button; highlights and comments already work per topic (Step 4).
- **Mock test** (moved from V3): choose 15/30/45 minutes (~1 mark per minute) → a timed paper with multiple choice, short, long and numerical questions written **only from the chapter's fact-checked revision points**, in the style of your uploaded previous-year papers if any. **Numerical answers are re-calculated by the server and a question whose answer doesn't check out is dropped.** Countdown with auto hand-in; multiple choice is marked automatically; for written answers you see the model answer and tick the examiner's points you covered. "Save my result" stores it (synced to your account); the dashboard shows **Recent mock tests**.

**Tests:** 379 unit tests (new: merged revision sheet, interleaved quiz and per-topic scores, break points, minutes left, mock-test schema rules, numerical re-check dropping wrong answers, prompt limits, self-marking, synced results). Playwright: 47 checks pass, including reading to the end of each topic (3 of 3 done), resume banner after reload, revision sheet and quiz present, taking and marking a mock test, and the result on the dashboard, at desktop/375px × light/dark.

**Regression eval:** not re-run tonight. The lesson prompt, lesson schema, verifier and grounding did not change in V2.5 (the eval doesn't use uploads), so the earlier scores still describe the lesson pipeline (E&M 83.2%, Engineering Maths 88.5%). A full regression run is planned with V3 · Step 5's resumable eval runner, to protect the free quota.

**✅ Check this**

- Open a chapter lesson (Step 4 check), read to the end of a topic: the bar shows "1 of N topics done" and the topic gets ✓ in the drop-down.
- Scroll to the middle of topic 2, wait 2 seconds, close the tab, reopen it from History: "Continue where you left off" appears. The dashboard shows "Continue your chapter lesson".
- Press **or play the short version now** in Chapter audio: it reads through every topic with chapters per topic.
- At the end: answer the mixed quiz; open the dashboard: weak topics/quiz scores update per topic.
- **Chapter mock test** → 15 min → Start: a timer counts down; answer, **Hand in my answers**, tick points for the written ones, **Save my result**: the dashboard's "Recent mock tests" shows it.
- Edge case: leave the test running until the timer ends: it hands itself in.

### V2.5 · Step 4: building the chapter lesson (tag `v2.5-step-4`)

**Built:** "Start the lesson" on the plan page opens `/chapter/lesson`. It first shows the chapter's **introduction** ("Why this chapter matters", "How the topics fit together"), then builds **one topic at a time** in the plan's order, so you can read topic 1 while the rest are prepared ("2 of 8 topics ready: you can start reading now"). Each topic is a normal topic lesson from `/api/lesson`, so it is **reused from the shared library** when one exists and otherwise goes through grounding and the fact-check pass; its length is the lesson size closest to the minutes it got. Short **bridges** link each topic to the next and a **wrap-up** ends the chapter. The introduction/bridges/wrap-up come from a new `/api/chapter-parts` (one AI call, told not to add facts, Zod-validated, retried once) and are **cached in the shared library** by chapter, level, minutes and topics (they never contain your notes). Each topic is wrapped like a single-topic lesson, so highlights, comments and "Explain simpler" work and are shared with that topic's own page; each has "Open this topic as its own lesson". Every finished topic is **saved on the device** (new local store, database version 8), so closing the tab and coming back continues with only the missing topics. If the AI quota runs out, the stopped topic says so with "Try again" and the finished topics stay.

**Tests:** 369 unit tests (new: intro/bridges/wrap-up schema and fallbacks, prompt rules, lesson-length rounding, library cache and stale versions, local store resume). Playwright: 43 checks pass, including plan → start → intro → three topics → bridges → wrap-up, and a reload that shows everything instantly without rebuilding, at desktop/375px × light/dark.

**✅ Check this**

- http://localhost:3000 → Electricity & Magnetism → Electrostatics → **Choose topics**: Electric flux, Gauss's law, Applications of Gauss's law → First Encounter → Build my lesson → **Start the lesson**.
- You should see the introduction first, then "1 of 3 topics ready…" while topic 2 is prepared; scroll and read topic 1 meanwhile. Between topics there is a short grey bridge; at the end "Wrapping up the chapter".
- Highlight a sentence in topic 2, then open "Open this topic as its own lesson": the highlight is there too.
- Edge case: close the tab while topic 2 is still being prepared, reopen the same link (browser history): topic 1 appears at once and only the remaining topics are built.

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
- Chapter lessons show each topic's explanation, worked examples and common mistakes; the combined quiz, revision sheet and formula list are chapter-level extras in Step 5 (not repeated per topic). A topic marked "short recap" (already done well) skips worked examples and mistakes.
- Topic lessons inside a chapter use the standard lesson sizes (5/10/15/30… min), rounded to the nearest, so library copies are shared with single-topic lessons.
- A topic counts as "finished" when its end scrolls into view (no extra button), so it works the same on phone and desktop.
- Mock tests: ~1 mark per minute; written answers are self-marked from the examiner points (marks rounded); numerical questions must come with a calculation the server re-runs (within 1%), otherwise they are dropped. Mock results are a new synced collection (`mockResults`, database version 9, no existing data touched; the existing per-user Firestore rules already cover it).
- The regression eval was not re-run for V2.5 because nothing on the lesson-generation path changed; it will run with V3's resumable runner.

## Needs Sneha

- **Vercel preview link:** the GitHub CLI isn't signed in on this computer, so I couldn't read the preview URL. Open vercel.com → the Prism project → Deployments, and look for the `overnight-v2.5-v3` branch (if the project is linked to GitHub, every push made a preview).
- To use "Read with AI" on photos, nothing new is needed (it uses the existing `GEMINI_API_KEY`). Groq cannot read images, so if Gemini's quota is used up the button says so.

## Problems

- The run paused once at the Claude usage limit during V2.5 · Step 4 and resumed after the reset (no work lost).

## Accuracy

- Last measured (2026-10-03): Electricity & Magnetism 83.2% (re-scored), Engineering Maths 88.5%. Both shown as "sourced". Regression eval to re-run when quota allows.

## Pauses

- 2026-10-04 02:36: run started.
- Paused: Claude usage limit reached during V2.5 · Step 4 (server part done and committed as `wip:`). Resumed after the reset and finished Step 4.

## Next action

Build V3 · Step 2 (subject data model and loader: branches, semesters, shared subjects; E&M and Engineering Maths migrated without losing saved progress).
