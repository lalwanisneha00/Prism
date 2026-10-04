# Morning report: overnight run (V2.5, then V3)

Newest status at the top. Branch: `overnight-v2.5-v3` (nothing was merged into `main`).

## Summary

- **Finished:** **all of V2.5** (Steps 1–5; tags `v2.5-step-2` … `v2.5-step-5`), V3 · Steps 2–3 (`v3-step-2`, `v3-step-3`). V3 · Step 4 is built and committed as `wip:` but **not tagged**: its full browser re-run was stopped by the system for low memory (see Problems).
- **In progress:** V3 · Step 5 (accuracy scaffolding: `tested` tier, golden sets with source quotes, resumable eval, numerical and code checks).
- **Not started:** V3 · Steps 6–11 (the syllabus waves, my-own-syllabus matching, final regression and deploy).

## How to see it

- Branch: `overnight-v2.5-v3` (pushed to GitHub; Vercel builds a preview for it if the project is linked to the repo).
- Locally: `git checkout overnight-v2.5-v3`, `npm install`, `npm run dev`, open http://localhost:3000.
- Automated checks: `npm run check`, `npm run build`, `npm run test:e2e` (Playwright, uses the fake AI, no quota).

## Finished steps and "✅ Check this"

### V3 · Step 4: Other subjects (tag `v3-step-4`)

**Built:**

- **Entry points:** an **Other subjects** section on the Subjects page, a "+ Other subject" chip in the home picker, and **My subjects** (`/my-subjects`). One-tap suggestions (Indian Knowledge System, Environmental Science, Universal Human Values, Organisational Behaviour, English Communication, Constitution of India, Professional Ethics, Economics for Engineers, Principles of Management) fill in the name only, plus "Add my own subject".
- **Setup form:** name; theory or skill subject (guessed from the name, editable); **units and topics, optional**: type them, paste a syllabus, or upload the syllabus file (any V2.5 format); "Check my outline" reads it into units and topics (no AI: understands "Unit 2: Title (8 hours) – topic, topic" and lists); **your material, optional and recommended** (any format, stays on the device); **exam details, optional**: exam date, marks per question, written/MCQ, internal/end-semester, semester, language, units in the next exam. With no topics, syllabus or material it asks for one, never a generic lesson.
- **Outline built from your material:** with files but no topics, Prism proposes units → topics (one AI call to tidy it; a free on-device version is used if the AI isn't available), labelled "Outline built from your material", and the **outline editor** lets you rename, reorder, merge a unit into the one above, delete and add. Topics keep their ids when renamed elsewhere, so progress isn't lost.
- **Lessons:** a custom subject works everywhere a built-in one does: single topic, several topics or a whole unit (with the Quick/Standard/Thorough options and "Why these timings?"), levels, audio, quiz, flashcards, highlights, chapter lessons, chapter and multi-chapter mock tests. Its lessons are grounded in **your material first**, then **Wikipedia articles found for each topic**; it is `limited` until you upload material, then `sourced`, and the subject page says so with an upload prompt. **Theory style:** mind maps, timelines, comparison tables; in **Exam Prep**, model answers for 2, 5 and 10 marks with the points examiners look for and how to structure a long answer. **Skill subjects** get practice exercises and formats (letters, emails, reports) with examples. These rules apply only to custom subjects, so built-in lessons and library copies are unchanged.
- **Subject page** (`/my-subjects/view?id=…`): tier, exam date countdown, pattern, units in the next exam, shortcuts (Start a lesson, My materials, Mock test, Edit), chapters with progress. Uploaded **previous-year papers mark the topics asked most** ("asked 3×"), on built-in subject pages too.
- **Storage and privacy:** your subjects sync to your account (new `customSubjects` collection, database version 10, no existing data touched; existing Firestore rules already cover it) and are in export/import backups. Files and their text stay on the device. Lessons from custom subjects or private uploads are **never** written to the shared library. **My subjects** has open, edit, duplicate and delete.

**Tests:** new unit tests: syllabus reading (units, hours, bullets, round trip), ids that survive edits, skill/theory guess, custom subject as an ordinary subject (passes the catalogue checks; limited without material, sourced with it), saved/synced/edited/duplicated/deleted, outline from material and excerpts, Wikipedia search sources with fallback, prompt rules only for custom subjects, request validation with a custom subject. Playwright: suggestion → pasted syllabus → outline edit → exam details → saved → subject page → topic lesson → whole-unit lesson through plan and build; "add topics or material" message; outline from an uploaded deck (labelled) and the file kept in My materials; duplicate and delete, at desktop/375px × light/dark.

**✅ Check this**

- http://localhost:3000/subjects → Other subjects → **Indian Knowledge System** → paste:
  `Unit 1: Vedic literature – The four Vedas, Upanishads` / `Unit 2: Indian mathematics – Zero and the decimal system, Aryabhata` → **Check my outline** → rename a topic → Exam details: "2, 5 and 10 marks" → **Save my subject**.
- The subject page shows "Limited" with "Upload your slides or notes"; tap a topic → the picker opens with it chosen → **Exam Prep** → the lesson has model answers sized for marks (with real Gemini).
- **Add my own subject** → name "Environmental Science" → add a slide deck only → Save: "Outline built from your material" appears for you to edit; save again: the subject is "Sourced" and the deck is in My materials for it.
- Edge case: name only, no topics or files → Save: the friendly "Add your topics, paste your syllabus, or upload…" message.

### V3 · Step 3: navigation for many subjects (tag `v3-step-3`)

**Built:**

- **My branch and semester**: two dropdowns on the home page picker and the new **Subjects** page (🎓 in the header). The choice is saved in your settings (synced when signed in); the picker then shows only your subjects, with "Show all N subjects".
- **One search box for everything** (home page and Subjects page): type any subject, chapter or topic (e.g. "taylor", "electrostatics"); a topic opens the picker with subject, chapter and topic already chosen; a subject or chapter opens its subject page.
- **Subjects page** (`/subjects`): "My subjects: Mechanical Engineering, semester 1", then every subject by semester, each with its trust tier, branches and semesters.
- **Subject page** (`/subjects/em`): trust badge, branches, semesters, **syllabus source**, shortcuts (Start a lesson, Mock test, Concept map, My materials, Planner), weak topics in that subject, and every chapter (including linked ones, labelled "from …") with a progress bar, coloured topic dots linking straight into the picker, and "Study this chapter".
- **Mock test across several chapters** (`/mock-test?subject=…`, built on the V2.5 generator): tick the chapters; only chapters with lessons you've studied or saved on this device can be chosen, so questions only come from fact-checked material (no extra AI calls to gather it); with none yet it explains why and links to start a lesson.
- The picker supports chapters linked from another subject (lessons are made under the chapter's owner).
- Fixed on the way: a race where choosing a branch before saved settings had loaded was undone; the header now fits at 375px with the extra Subjects icon.

**Tests:** 387 unit tests (new: catalogue-wide search and links, device lessons grouped per chapter). Playwright (all modes): search → picker preselected; branch + semester saved and shaping the list on another page; subject page → topic → picker; unknown subject is a 404; multi-chapter mock test empty state → study and save a lesson → that chapter becomes available → timed test starts; no sideways scrolling at 375px.

**✅ Check this**

- http://localhost:3000/subjects → My branch **Mechanical Engineering**, Semester **1**: "My subjects" lists Electricity & Magnetism and Engineering Mathematics. Go to the home page: the picker shows the same branch and only your subjects.
- In the search box type **eigen**: pick the topic; the picker opens with Engineering Mathematics, its chapter and the topic chosen.
- Open **/subjects/em**: chapters with progress bars and coloured topic dots; tap a topic to land in the picker with it chosen.
- **/mock-test?subject=em** on a fresh browser: the "study a few topics first" message. Save one lesson, come back: its chapter can be ticked.
- Edge case: choose a semester with no subjects yet (e.g. Semester 1 then switch branch to one with nothing in later semesters): "No built-in subjects for that semester yet".

### V3 · Step 2: subject data model and loader (tag `v3-step-2`)

**Built (no visible change yet; this is the foundation for 60+ subjects):** branches are data (`src/data/branches.json`: 15 branches with their wave). Each subject file now records the **branches** that study it (`["all"]` for the first-year common core, so a shared subject is stored once), its usual **semesters**, its **syllabus source** (kind, title, link, what was checked), a preferred **visual set**, and optional **links** to chapters of another subject (shown there but taught and saved under their owner, never copied: this is how Applied Physics will include E&M). Adding a subject is just adding `<id>.json` (and `<id>-sources.json`): a script regenerates the subject index before dev/build/test, and a test fails if the index is stale. The whole catalogue is validated at start-up (duplicate ids, unknown branches, prerequisites that don't exist, broken links). New queries: subjects for a branch and semester, semesters of a branch, branches of a subject, chapters including linked ones. **Saved progress is untouched:** every existing subject/chapter/topic id is unchanged and listed in `src/lib/subjectIds.lock.json`; a test fails if any published id is ever renamed or removed. E&M and Engineering Maths record their real origin honestly: OpenStax textbooks, "to be matched to the AICTE Model Curriculum in V3 · Step 6".

**Tests:** 382 unit tests (new: catalogue loads clean, id lock, index up to date, syllabus source present, branch/semester queries, every catalogue error is caught, linked chapters keep their owner). All 47 Playwright checks still pass (nothing regressed).

**✅ Check this**

- Open `src/data/subjects/em.json`: new `branches`, `semesters`, `syllabusSource`, `visualSet` fields at the top; chapters unchanged.
- Read `src/data/subjects/README.md` (the format for every future subject).
- Edge case: rename any topic id in `em.json` and run `npm test`: the "never renames or removes a published id" test fails (then undo).

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
- Subject index: generated by a script (bundlers can't list a folder at runtime), committed, and excluded from Prettier; a test keeps it in step with the folder.
- The `tested` tier is not in the subject schema yet: it comes with its badge and behaviour in V3 · Step 5.
- First-year common subjects use `branches: ["all"]` rather than listing all 15 branches.
- Multi-chapter mock tests only use lessons already on the device (saved lessons and chapter lessons), never new AI-written facts; chapters without studied material can't be chosen.
- Search results for a topic open the home page picker (not a lesson straight away), so the student still chooses level and time.
- Custom subjects: sources are the student's material plus Wikipedia articles found by searching "topic + subject name" (2 per topic, the topic alone if nothing is found). Tier: `limited` without uploaded material, `sourced` with it.
- Custom subject pages live at `/my-subjects/view?id=…` (their ids exist only in the student's account, so they can't be pre-built pages like `/subjects/em`).
- The outline-from-material AI call is one request per subject set-up; if it fails (quota, offline) the on-device outline is shown instead.
- Exam details are stored and shown on the subject page; using the marks pattern inside generated mock tests is left for later (mock tests already follow uploaded previous-year papers).

## Needs Sneha

- Re-run the full browser suite for V3 · Step 4 when the computer has free memory: `npx playwright test` (it uses the installed Edge and the fake AI, about 15–40 minutes). If it passes, tag it: `git tag v3-step-4 && git push --tags`.
- Wave 1 syllabus sources so far: [GCE Kalahandi first-year syllabus (AICTE model)](https://www.gcekjr.ac.in/pdf/news/2018/2758Proposed_First_Year_BTech_Syllabus_As_Per_AICTE_Model_Curriculum.pdf) and [IET Lucknow K-series first year (AICTE model)](https://ietlucknow.ac.in/sites/default/files/syllabus/K_Series_B_Tech_1st_Year_AICTE_Model_Curriculum_EFS_2020_21_4.pdf). Programming for Problem Solving there is C only; Environmental Science still needs a source.

- **Vercel preview link:** the GitHub CLI isn't signed in on this computer, so I couldn't read the preview URL. Open vercel.com → the Prism project → Deployments, and look for the `overnight-v2.5-v3` branch (if the project is linked to GitHub, every push made a preview).
- To use "Read with AI" on photos, nothing new is needed (it uses the existing `GEMINI_API_KEY`). Groq cannot read images, so if Gemini's quota is used up the button says so.

## Problems

- **Full browser re-run for V3 · Step 4 was stopped by the system (computer low on memory)**, not by a test failure. Unit tests (407) and the production build passed, and the 4 new Other-subjects browser tests passed on desktop. To finish verifying: `npx playwright test` (all modes), then `git tag v3-step-4`.

- The run paused once at the Claude usage limit during V2.5 · Step 4 and resumed after the reset (no work lost).

## Accuracy

- Last measured (2026-10-03): Electricity & Magnetism 83.2% (re-scored), Engineering Maths 88.5%. Both shown as "sourced". Regression eval to re-run when quota allows.

## Pauses

- 2026-10-04 02:36: run started.
- Paused: Claude usage limit reached during V2.5 · Step 4 (server part done and committed as `wip:`). Resumed after the reset and finished Step 4.

## Next action

Build V3 · Step 5 (accuracy scaffolding: `tested` tier and badge, golden-set format with source URL + exact quote and a quote checker, resumable rate-limited eval runner, numerical answers with units, code checking).
