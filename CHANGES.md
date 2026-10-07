# Changes in this round: PDEU's own syllabus

Source: `PDEU_BTech_All_Branches_Syllabus.pdf` (the university's curriculum handbooks, 7 branches: Computer, ICT, Electronics and Communication, Civil, Petroleum, Biotechnology, Mechanical). Electrical and Chemical are not in that file, so they keep the usual Prism lists.

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
