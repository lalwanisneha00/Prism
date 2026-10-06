# Changes in this round

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
