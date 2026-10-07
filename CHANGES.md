# Changes in this round: Prism's subjects are now PDEU's

Source: `PDEU_BTech_All_Branches_Syllabus.pdf` (the university's curriculum handbooks: Computer, ICT, Electronics and Communication, Civil, Petroleum, Biotechnology, Mechanical). Electrical, Chemical and every other branch are not in that file, so they were **removed** (branches and their subjects).

## What changed

- **The catalogue is PDEU's syllabus.** Every PDEU *core* course that prints a unit-wise syllabus is a subject (272 subjects, about 10,200 topics): PDEU's name, course code, category, L-T-P, credits, units (as chapters, with hours) and topics. Where branches teach the same course with the same syllabus it is one subject; where their versions differ, each version is its own subject with the branches in brackets, e.g. "Mathematics - I (CE, ECE, Civil)". Built by `scripts/build-pdeu-subjects.mjs` from `src/data/pdeu/*.json` (made from the PDF by `scripts/build-pdeu.mjs`).
- **Subjects no longer taught at PDEU are gone** (for example Electricity & Magnetism, Engineering Mathematics, Mining, Aerospace). Their ids were released on purpose, so `src/lib/subjectIds.lock.json` was rebuilt from the new catalogue (saved progress on old topics will not match).
- **Credits and details beside every subject name**: lists (lesson picker, subjects page), the subject page (code, category, credits, L-T-P, per-branch semester and credits, link to the handbook page).
- **Core and non-core sections** on `/subjects` for a PDEU branch and semester, with the semester's credit total. Core cards open the Prism subject; non-core courses (humanities, values, open electives, internships) list their units and topics and offer "Upload faculty material".
- **Accuracy kept as high as possible without new tests**: when a PDEU topic is (nearly) identical to an earlier Prism topic, the earlier topic id is reused, so its checked sources, prerequisite links and widgets still apply (131 topics). 78 more PDEU topics reuse an older topic's widgets/PhET simulations through `src/data/visualAliases.json`. Prerequisite arrows on the concept map otherwise follow the handbook's teaching order inside a unit. Subjects with reused topics are tier "sourced", the rest "limited" (no sources yet).
- **Accuracy tests were not run.** Golden sets and scores for the old catalogue are archived in `eval/archive-pre-pdeu/`; the app shows "No test set yet" for every subject until the new tests are written and run.

## Not done / honest

- Most of the 10,000 new topics have no checked sources and no widget yet (about 280 topics have a widget; the generic visual toolkit works for all). Lessons are still fact-checked, but expect weaker grounding until sources are added.
- Topic names are split from the handbook's sentences at commas, semicolons or dashes, so a few are long or cut oddly; read the handbook for exact wording.
- Mechanical is PDEU's old 2016-17 curriculum (the handbook says so).
- To regenerate the subjects you need the old subject files (for topic-id reuse): `git archive 25797ab src/data/subjects src/data/curatedLinks.ts | tar -x -C <folder>` (commit `25797ab` is the last one before the move).
- Tests: two old subjects (`em`, `engg-math`) live in `test-fixtures/catalogue/` and are added to the catalogue for unit tests only (the hand-written Gauss's-law sample lesson and many tests are built on them).

# Earlier round: PDEU layer (before the catalogue move)

## Built

- **PDEU syllabus as data**: `src/data/pdeu/<branch>.json`, made by `scripts/build-pdeu.mjs` from the PDF text (`pdftotext -enc UTF-8 -layout file.pdf out.txt`, then `node scripts/build-pdeu.mjs out.txt`, then `npx prettier --write src/data/pdeu`). About 500 courses with code, category, L-T-P, credits, units with hours and topics, lab experiments, elective options. The script stops if a semester's credits differ from the credit table printed in the PDF (only Mechanical semester 8 differs, because the handbook has two alternative project routes).
- **/subjects**: for a PDEU branch and a chosen semester, two sections, **Core subjects** and **Non-core subjects**, each course with code, category, L-T-P, credits, units/topics, and the semester's credit total.
- **/pdeu/[branch]/[key]**: one course: all details, units (hours) and topics, experiments, elective options, handbook notes. Core courses that Prism teaches show a link to Prism's checked lessons (`src/data/pdeu/prism-match.json`, only clear matches; "part" when Prism's subject is wider or narrower). "Study this syllabus on Prism" makes a subject on the student's account with PDEU's units and topics (so lessons, quizzes and flashcards work for every topic). Non-core courses offer "Upload faculty material".
- A course whose handbook prints no syllabus (for example Indian Knowledge System) says so; nothing is invented.

## Decisions

- Prism's 84 built-in subjects keep their ids (progress, highlights and the library are keyed by them, and a test locks them), so they were **not rewritten**. PDEU's names, units and topics live in the new PDEU layer and map onto Prism's subjects where there is a clear match.
- Existing tests that picked Computer or Mechanical Engineering to see the generic suggestions now use Electrical Engineering (not in PDEU's file).

## Not done / honest

- Many PDEU courses (most of Civil, Biotechnology, Mechanical and the electives) have no Prism subject yet; they are studied from the syllabus alone (limited tier) until faculty material is added.
- Mechanical is PDEU's old 2016-17 curriculum (the handbook says so); it is shown with that warning.
- Topic lists are split from the handbook's sentences at commas/semicolons, so a few topic names are long or cut in odd places. Open the handbook text for the exact wording.

---

# Earlier round: My subjects

## Built

- **My subjects** (`/subjects`): branch + semester (1-8, remembered); "Upload your semester's official syllabus"; personal subject cards; collapsed "All other subjects on Prism" with search.
- **Syllabus reader** reads real PDFs page by page: codes, titles, units, topics, Course Outcomes, credits; labs are listed, not made into subjects; unclear parts are flagged, never guessed.
- **Matching**: clear matches are used; Mathematics I style, renamed or uncertain ones go to a confirmation screen (Yes / Choose another subject / Treat as new subject, changeable later). Subjects Prism lacks are added as your own with the optional faculty-material note.
- **Personal notes, never changing shared data**: "Not in your syllabus, but you can study this..." in the lesson picker and a marker on the concept map; split subjects say "may come in a later semester" and fill up as more semesters are uploaded. Syllabus topics Prism lacks are listed with an optional upload link.
- **Course Outcomes** are sent (Zod-checked) to the lesson prompt to set depth; such lessons are personal.
- **Concept map**: collapsed "Choose subject" with "Search subject" (your subjects first); map data loads only when chosen. "Find a topic" and hover unchanged.
- Data lives in the synced settings record (`syllabus`), optional, so old data still loads. Old "hide chapters" page now redirects to /subjects.
- Real 404 for unknown subject ids (fixed a regression from the loading skeleton).

## Verified

- Tests: parser on PDEU's official Computer Engineering Sem 1 syllabus (7 subjects, 3 labs, 6 COs each), matching, coverage, emphasis, widgets. New browser spec (desktop + 375px) uploads the real PDEU PDF: 8/8 pass. Navigation, other-subjects, map, smoke, wave1, planner, eval-status specs pass on desktop and mobile light.

## Not done / honest

- Performance targets NOT met (see PERF_REPORT.md).
- Accuracy gates (golden set) were NOT re-run this round; no subject data was changed. `npm run check` result is in the final message.
- Indian Knowledge System and Organisational Behaviour are not in PDEU Sem 1 (Organisational Behaviour is Sem 2); tested with Universal Human Values, English Communication, Biological Systems instead.
- Dark-mode and full four-mode browser runs of the new spec were not done (light only).
- `SubjectProgress` and the planner still use the old inert scope hooks; no syllabus notes there yet.
- Faculty-material upload for "not on Prism yet" topics reuses the own-subject page; not tested end to end.
