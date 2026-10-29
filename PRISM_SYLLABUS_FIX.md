# Prism: Syllabus Fix + Student Correction System (Master Prompt)

## Step zero: save this prompt (do this before anything else)

If `PRISM_SYLLABUS_FIX.md` does not already exist in the project root, create it now and save this **entire prompt into it, word for word**, from the title to the very last line. Don't summarise or shorten it. After a chat clear, this file is the only copy of the plan you'll have.

Then also create `docs/SYLLABUS_AUDIT.md` if it doesn't exist (Phase 0 fills it in).

## How to resume after a /clear

When I say **"continue the syllabus fix"**:

1. Read `docs/SYLLABUS_AUDIT.md` first, especially the **Progress Log** at the bottom.
2. Read only the section of `PRISM_SYLLABUS_FIX.md` for the next unfinished phase (plus the Hard rules).
3. Do that one phase, then stop. Don't re-explore the codebase; the audit file already has what you need.

## Read this first, Claude

You are working on Prism, an existing AI study-guide web app for B.Tech students at PDEU (Pandit Deendayal Energy University). It already works: accounts, cross-device sync, lessons, visuals, mock tests, weak-topic tracking, uploads (V2.5), branch/semester-aware subject search. **All of that stays as it is.**

The problem: the syllabus data came from one big merged PDF of official course handouts. It is outdated for some branches and badly parsed in places. Examples found by real students:

- An ICT student's semester has 6 subjects, but only 5 show at the top of search. "AI" is missing from his branch/semester mapping.
- A Mechanical student opened a chapter and the topic list belonged to a different chapter. Some chapters also seem to be in the wrong semester.

I now have separate, up-to-date course handout PDFs for each branch, in the `handouts/` folder.

### Hard rules for this whole task

1. **Rearrange, don't redo.** Do NOT delete and rebuild the syllabus. Keep every existing subject, chapter and topic ID that still makes sense, and fix it by moving it (changing its parent, order, semester or branch mapping). Only create new records for things that are genuinely missing. Only retire (soft-delete, never hard-delete) things that genuinely don't exist in any handout.
2. **Never break existing user data.** Progress, weak topics, mock test results, highlights, comments and saved lessons are linked to existing IDs. Those links must survive every change.
3. **Never regenerate lessons in bulk.** If a topic moves, mark its cached lessons as `stale` so they regenerate only when a student next opens them.
4. **Save tokens.** Don't read the whole codebase. Read only the files you need for the current phase. Don't read handout PDFs into your own context one by one: write a script that extracts and parses them, run it, and only look closely at the ones that fail.
5. **Free only.** No paid APIs or paid services. Use the database, auth and AI provider Prism already uses. If something would need a paid tier, stop and tell me.
6. **Additive database changes only.** Add tables and columns. Don't drop or rename existing ones. Write migrations so they can be rolled back.
7. **Stop at the end of every phase.** Give me a short plain-English summary: what you changed, which files, and how the pieces fit together (use an everyday analogy). I'm still learning and I want to understand what I built. Then follow rules 9 and 10 (update the audit file, ask about the commit). Never start the next phase on your own; I'll /clear and say "continue the syllabus fix" when I'm ready.
8. Never use em dashes in any UI text you write.
9. **Keep `docs/SYLLABUS_AUDIT.md` up to date.** At the end of every phase, before you summarise to me, update it so a fresh session with zero memory can continue. Update the relevant sections (data shape, files, risks, plan) and add an entry to the **Progress Log** at the bottom:
   - Phase number and status (done / partly done / blocked)
   - Files created or changed
   - Database changes (tables, columns, migrations)
   - Decisions I made or approved (e.g. "Phase 2 report approved", config values like vote thresholds)
   - Anything left unfinished or any open problem
   - **Next step:** exactly which phase comes next and anything to check first
     Keep the whole file under ~250 lines: condense older log entries into one or two lines each if it grows.
10. **Commit to GitHub after every phase, only when I confirm.** After the phase summary, ask me: "Phase N is done. Commit and push to GitHub?" Then wait.
    - If I say okay / yes / commit: run `git status`, stage the changes, commit with a clear message like `Syllabus fix: Phase N, <short description>`, push to the current branch, and tell me it worked (or show me the error in plain English if it didn't).
    - The audit file update (rule 9) must happen **before** the commit, so the Progress Log is saved in GitHub too.
    - Never commit `.env` files, API keys, secrets or `node_modules`. Check `.gitignore` first.
    - Don't commit the handout PDFs themselves (add `handouts/**/*.pdf` to `.gitignore`, since the repo may be public and PDFs bloat it). The parsed JSON in `handouts/_parsed/` and the reports are fine to commit.
    - If I say no, don't commit; just log "not committed" in the Progress Log.
    - After a successful commit, remind me: "You can /clear now, then say: continue the syllabus fix."

---

## Phase 0: Audit (read only, change nothing)

1. Find where the syllabus lives now (database tables, JSON files, seed scripts, or a mix) and how subjects, chapters and topics are linked to branches and semesters.
2. Find every place that depends on syllabus IDs: progress, weak topics, mock tests, lesson cache, highlights/comments, search ranking, concept map, planner.
3. Find the existing upload pipeline (V2.5) and the AI provider used for extraction.
4. Find how auth and user profiles store branch, semester and batch year.
5. Fill in `docs/SYLLABUS_AUDIT.md` with: tech stack (framework, database, auth, AI provider), current data shape, key file paths, every dependency, risks, how to back up the database for free, and your plan for Phases 1 to 8 adjusted to what you found. End it with a `## Progress Log` section and log Phase 0.

Stop and summarise.

---

## Phase 1: Syllabus as a tree (additive data model)

Reshape the syllabus into a clear tree **by adding fields, not rebuilding**:

`Branch → Semester → Course (course code) → Unit/Chapter → Topic`

Add to each node (course, unit, topic) where missing:

- `course_code` (on courses; this is the main matching key)
- `parent_id` and `order_index`
- `branch_ids` and `semester` mapping (a course can be shared across branches, like common first-year subjects)
- `batch_year` (syllabus can differ between batches)
- `source`: `official_site` | `admin_handout` | `student_handout` | `student_fix`
- `confidence`: `unverified` | `pending` | `verified`
- `status`: `active` | `retired` (soft-delete)
- `verified_by_count`

Add a `syllabus_history` table: every change stores what changed, old value, new value, who/what caused it, timestamp, and a `reverted` flag. This is the undo button for everything later.

Mark all current data as `source = official_site`, `confidence = unverified`.

Add `stale` (boolean) to cached lessons if there isn't something equivalent.

Stop and summarise.

---

## Phase 2: Import my handouts and rearrange (dry run first)

Handouts are organised as:

```
handouts/<BRANCH>/sem<N>/<anything>.pdf
```

Branch folder codes (folder labels only; map each to whatever branch ID/name Prism already uses, and record the mapping in the audit file):

| Folder code | Branch                                    |
| ----------- | ----------------------------------------- |
| COMP        | Computer Engineering                      |
| ICT         | Information & Communication Technology    |
| CSBS        | Computer Science & Business Systems       |
| ECE         | Electronics & Communication Engineering   |
| ELEC        | Electrical Engineering                    |
| MECH        | Mechanical Engineering                    |
| CIVIL       | Civil Engineering                         |
| CHEM        | Chemical Engineering                      |
| PETRO       | Petroleum Engineering                     |
| BIOTECH     | Biotechnology                             |
| CSSE        | Climate Science & Sustainable Engineering |

If you find a branch folder with a code not in this table, or a branch in Prism with no folder, list it in the report instead of guessing.

### Course type (Phase 2)

PDEU handouts classify every course as **Theory**, **Practice** or **Practical** (lab). Detect it for every course:

- From the handout itself: course type field, teaching scheme (L-T-P hours), or a "Lab"/"Laboratory"/"Practical" title or list of experiments.
- From the course code if it has a type suffix (for example, codes ending in T or P), but only if the handout agrees. If they disagree, put it in `needs_review`.
- Store it as `course_type`: `theory` | `practice` | `practical`, on the course node. Theory and lab parts of the same subject can be separate courses; keep them separate and link them as related.
- For practical courses, the "units/topics" are the **list of experiments**. Parse each experiment as its own node (number, title, and aim if given).
- Add per-type counts to `REARRANGE_REPORT.md` and list any course whose type couldn't be detected.

Theory and Practice courses keep using the existing lesson generator, unchanged.

**CSBS and CSSE are skipped for now.** They're newer branches and their handouts aren't available yet. Leave all their existing Prism data exactly as it is: don't move, retire or re-verify anything that belongs only to CSBS or CSSE, and don't treat their subjects as "extra item not in any handout". If a course is shared between CSBS/CSSE and another branch, you may fix it for the other branch, but keep its CSBS/CSSE link. Mark their data as `confidence = unverified` so the student flag and upload features (Phases 3 to 5) can fix them later. Record this in the audit file.

Semester folders are `sem1` to `sem8`. Common first-year courses may appear in several branch folders: match them by course code and link one course to all those branches, never duplicate it.

**Combined PDFs are allowed.** A semester folder may contain one PDF per subject, OR one PDF with the whole semester's handouts stacked together, OR a mix. Handle it like this before parsing:

0. **Split step** (`scripts/split-handouts`):
   - For every PDF, scan each page's text locally (free library) for where a new course handout starts: a course code at the top of a page, plus headings like "Course Code", "Course Name", "Teaching Scheme" or "Course Objectives".
   - If a PDF contains more than one course, cut it into one PDF per course at those page boundaries, using a free local PDF library. Save the pieces to `handouts/_split/<BRANCH>/sem<N>/<COURSECODE>_<short title>.pdf`. Never modify or delete my original PDFs.
   - Single-course PDFs are just copied to `_split` as they are.
   - Write `handouts/_split/SPLIT_REPORT.md`: for each branch and semester, how many courses were found, their codes and titles, and the page range each came from. Flag anything suspicious: a semester with fewer than 4 or more than 9 courses, a piece only 1 page long, the same course code twice, or pages that didn't belong to any course.
   - Stop and show me the per-semester course counts so I can check them against the real number of subjects. Wait for my OK before parsing.
   - All later steps read from `handouts/_split/`, not the originals. Add `handouts/_split/**/*.pdf` to `.gitignore` too.

1. **Write a script** (e.g. `scripts/import-handouts`) that, for each PDF:
   - Extracts text locally (free library, no API).
   - Finds the course code, course title, units/chapters (with order) and the topics inside each unit. PDEU handouts follow a similar layout, so try rule-based parsing first.
   - Only if rule-based parsing fails, fall back to Prism's existing free AI provider for that one file.
   - Saves the result as JSON in `handouts/_parsed/`.
   - Logs files it couldn't parse confidently to `handouts/_parsed/FAILED.md`.
2. **Write a matcher** that compares parsed handouts with the current syllabus:
   - Match courses by course code first, then by fuzzy title.
   - Match units and topics by fuzzy name within the course, then across the whole branch to catch things in the wrong place.
   - Classify every difference: `course missing from branch/semester`, `course in wrong semester`, `course in wrong branch`, `unit under wrong course`, `unit wrong order`, `topic under wrong unit`, `topic missing`, `extra item not in any handout`.
   - Anything below a confident match threshold goes to a `needs_review` list. **Do not guess.**
3. **Dry run:** produce `handouts/_parsed/REARRANGE_REPORT.md` with counts per branch, then the full list of planned moves, additions and retirements, then the `needs_review` list. Change nothing yet.

Stop. Show me the summary numbers and wait for my approval.

4. After I approve: apply the changes as **moves** (update parent/order/semester/branch), add only what's missing, soft-retire extras, log everything to `syllabus_history`, mark affected lessons `stale`, set touched nodes to `source = admin_handout`, `confidence = verified`.
5. Run a check that no user progress, weak topic, highlight or mock test record points to a missing ID.

Stop and summarise.

---

## Phase 3: Students upload their course handout

Reuse the V2.5 upload pipeline. Don't build a new one.

1. On a course page, if confidence is not `verified` for the student's batch, show a small friendly banner: "Got this semester's handout for this course? Upload it and help fix Prism for everyone."
2. Run the same parser + matcher from Phase 2 on the upload.
3. Show the student a preview: "Here's what we found: [units and topics]. Does this look right?" with Confirm / Edit / Cancel.
4. On confirm, the differences become **proposals** (Phase 5) worth 3 points each, not instant changes.

Stop and summarise.

---

## Phase 4: Flags and "add missing subject"

Structured flags only (a small menu, plus an optional short note). Each flag records user, branch, semester, batch year, target node, flag type and any extra choice.

**Course level**

- "Not in my semester" → ask "Which semester is it in?" (dropdown, or "Not in my branch at all")
- "Not in my branch at all"
- "Shown twice / duplicate"

**Unit/chapter level**

- "Belongs to a different course" → pick which
- "Wrong order" → drag to correct position or pick position
- "A chapter is missing" → name it (optional: upload handout)

**Topic level**

- "Belongs to a different chapter" → pick which
- "Not in my syllabus"
- "A topic is missing here" → name it

**Lesson level** (on every generated lesson, including audio lessons and visuals)

- "Wrong fact or explanation"
- "Wrong formula, value or unit"
- "Doesn't match my syllabus / goes off-topic"
- "Visual or chart is wrong or broken"
- "Confusing, hard to follow"
- Optional: highlight the exact part of the lesson that's wrong, plus a short note.

**Add missing subject** (in subject search, when the list for their branch/semester is incomplete): "My subject isn't here" → course name, course code (optional), semester, optional handout upload. Before creating, check if the course already exists elsewhere (e.g. under another branch) and offer "Is it this one?" so it gets linked, not duplicated.

Put the flag button somewhere visible but not annoying (a small flag icon on course, chapter and topic rows, and on lesson pages).

Stop and summarise.

---

## Phase 4B: UI improvements (done)

Asked by the owner after Phase 4, before Phase 5. UI only: no syllabus data or IDs changed.

1. **Non-core lesson button:** in the lesson picker, a non-core subject without uploaded faculty material keeps "Build my lesson" disabled and shows, right under it, "Upload your faculty's material first, so this lesson matches your university's syllabus." ("Upload" opens the existing upload flow, `/notes?subject=<id>`). Shown as soon as the subject is picked; gone once material is uploaded.
2. **Subject list:** "Core subjects" and "Non-core subjects" sections; theory and practical (lab) courses as separate cards, each lab right after its theory course; tags under each name (Core / Non-core, Theory / Practical, each with its own colour and icon; "Elective" on elective slots); "Also has a lab: ..." / "Theory course: ..." links. Electrical and Chemical (no handbook list) get the same view from the course data.
3. **Subject detail page** (`/subjects/<id>`): code, tags, where it is taught, teaching scheme and credits, verification badge (plus the Phase 3 upload banner when not verified), link to the linked theory course or lab, units folded with their topics (first unit open), labs as a numbered experiment list (with aims), the concept map (folded; pointing at a topic lights up its prerequisites), non-core faculty material status with the upload link, "Start a lesson" (theory courses; lab lessons come in Phase 7B), and Phase 4 flags on the course, every unit and every topic or experiment. Labs now have their own pages (they stay hidden from search and the lesson picker until Phase 7B).

---

## Phase 5: Voting and auto-fix engine

Every flag or handout difference becomes (or adds to) a **proposal**: one specific change, e.g. "Move topic X from Unit 2 to Unit 3".

**Points**

- Flag = 1 point
- Confirmed student handout = 3 points
- "Agree" on a confirm prompt = 1 point
- "Disagree" = minus 1 point

**Who counts:** only students whose profile branch + semester (+ batch year) match the item. One vote per user per proposal.

**Auto-apply rule:** a proposal goes live when it reaches **3+ points from at least 2 different users** and has no strong opposing proposal. Make these numbers config values so I can tune them.

**Conflicts:** if two proposals contradict each other (two handouts disagree), don't auto-apply either. Send both to the admin queue.

**Confirm prompts:** when a proposal is pending, show other matching students a one-tap prompt: "2 students say AI belongs in ICT Sem 3. Agree?" Agree / Disagree / Not sure. Show at most one prompt per session so it doesn't get annoying.

**When a proposal applies:** move the node (never rebuild it), log to `syllabus_history`, update `source`, `confidence`, `verified_by_count`, and mark affected lessons `stale`.

### Lesson mistake flags (separate from syllabus voting)

Lesson flags don't need branch/semester matching: any logged-in student who opened that lesson can flag it. One flag per user per lesson version.

- **Threshold:** when a lesson (same topic, same lesson length/level) gets **4 or more flags from different students** (make this a config value, default 4), mark it `needs_regeneration`.
- **Regenerate with the feedback:** next time anyone opens it, regenerate that one lesson using Prism's existing free AI provider, and pass the students' flag types, highlighted parts and notes into the prompt as "known problems to fix". Keep the original syllabus topic and level.
- **Keep versions:** never overwrite the old lesson. Save the new one as version N+1, and keep a `lesson_versions` record (what was flagged, when it regenerated). Flags reset to zero for the new version.
- **Stop loops:** if a regenerated lesson gets flagged past the threshold again, don't keep regenerating. Send it to the admin queue (Phase 6) and show students a small note: "Students reported issues here. It's being reviewed."
- **Feed the pattern back:** if several lessons in the same subject or chapter keep getting flagged, mark that subject/chapter as `lesson_quality_warning` so I can see where Prism struggles. Don't change anything else automatically for this.
- Thank the flagger when their flag helps trigger a fix (same as Phase 7).

Stop and summarise.

---

## Phase 6: Admin dashboard + safety net

An admin-only page (only my account; enforce on the server/database side, not just by hiding the UI):

- Recently auto-applied changes, with a one-click **Revert** (uses `syllabus_history`)
- Conflicts queue (approve one side / reject both)
- `needs_review` items from Phase 2 imports
- Pending proposals close to the threshold
- Per-branch health: % of courses verified
- Lesson flags: lessons stuck in review after repeated flags (view flags, regenerate manually, or mark as fine), and subjects/chapters with `lesson_quality_warning`

**Abuse guards**

- Must be logged in to flag or vote
- Rate limit flags per user per day (configurable)
- If a user's flags get reverted repeatedly, their votes stop counting automatically (but keep their account working normally)

Stop and summarise.

---

## Phase 7: Trust badges, stale lessons, thanking contributors

1. **Badges** on courses and chapters: "Verified by N students from <Branch>, <Batch>" or "From official website, may be outdated. Help verify?"
2. **Stale lessons:** when a student opens a stale lesson, regenerate just that one (show a quick "Updating this lesson to match your syllabus" message).
3. **Thank the fixer:** when a student's flag or upload helps a change go live, show them "Your fix went live, N students are using it." Add a small contributor count on their profile.
4. **Search fix check:** confirm the branch/semester search ranking now reads from the new tree, so every subject of a student's semester appears at the top.

Stop and summarise.

---

## Phase 7B: Practical lessons

Practical courses get their own lesson format. Reuse Prism's existing lesson pipeline, visual system and PhET-style interactives wherever possible; don't build a second app.

### Lesson structure for each experiment

1. **Aim**
2. **Theory** behind the experiment (with formulas, linked to the related theory course's topics where they exist)
3. **Apparatus** (list, with a labelled diagram of the setup)
4. **Procedure** (numbered steps; each step can highlight the part of the diagram it uses)
5. **Observation table** (blank version to copy, plus a filled sample with realistic values)
6. **Calculations** (worked from the sample values)
7. **Result** (what the experiment is expected to show, with typical ranges)
8. **Precautions and sources of error**
9. **Viva questions** (5 to 8 common viva questions with short answers, since Indian lab exams usually include a viva)
10. **Interactive simulation**
11. **Video demonstrations**

### Interactive simulations

Students should be able to play with the experiment, e.g. move a coil along an axis and watch the magnetic field change, or move one of two coils and see the relative field between them.

- **Don't let the AI write a brand-new simulation from scratch for every experiment.** That's unreliable and expensive. Instead, build a small library of reusable, well-tested simulation templates with adjustable parameters, starting from the interactives Prism already has. Examples: magnetic field of a coil / two coils (move, rotate, change current), electric circuits (resistors, meters, potentiometer), optics (lenses, mirrors, refraction), oscillations (pendulum, spring), fluid flow, heat transfer, titration / chemistry reactions, logic gates, signals (oscilloscope view).
- For each experiment, the AI picks the best matching template and fills in its parameters (values, labels, which controls to show). Save that choice so it's reused, not regenerated.
- If no template fits, fall back to a labelled static diagram plus an animated step-through of the procedure, and log the experiment to `docs/SIMULATION_GAPS.md` so I know which templates to build next.
- Also link the matching free **Virtual Labs (vlab.co.in)** simulation when one exists (Indian government, IIT-led, free), as an extra option.
- Simulations must work on phones (touch controls, fits a narrow screen).

### YouTube videos

- **Never let the AI make up video links from memory.** Hallucinated links are worse than none.
- Use the free **YouTube Data API v3** (free API key from Google Cloud, no billing needed, daily quota). If a key isn't set up, stop and tell me exactly how to get one, step by step, on Windows. Store the key only in `.env`, never commit it.
- Search for the experiment, then rank results by: trusted channels first, then like count, view count and relevance. Start a **trusted channel list** in a config file: NPTEL, IIT/NIT official channels, Virtual Labs, Khan Academy, MIT OpenCourseWare, Walter Lewin, plus a few well-known Indian lab/engineering educators. Make it easy for me to add or remove channels. Check if Prism already has `curatedLinks.ts` or similar and reuse it.
- Show 1 to 3 videos per experiment, with title, channel and duration. Prefer videos under ~20 minutes.
- **Cache** the chosen videos per experiment so the API is called once per experiment, not on every page view (this keeps us inside the free quota).
- Add a "Video doesn't match this experiment" flag. If 3 or more students flag a video, hide it and fetch the next best one.

### Lesson flags

Practical lessons use the same lesson flag system from Phase 5 (wrong fact, wrong formula, broken visual, etc.), plus "Simulation is wrong or doesn't work".

---

## Phase 7C: Lab lessons v2

Before Phase 8, rework the practical lab lessons as described below.

### The problem

Phase 7B gave every lab the same format (aim, apparatus, procedure...). That's wrong for many labs. A Computer Programming lab doesn't need aim and apparatus; it needs the language, the topic and code examples. Also, the interactive diagrams in labs are much weaker than the ones in theory lessons, and circuit-based experiments don't show a proper circuit with every connection.

### Rule: reuse, don't rebuild

Keep everything from Phase 7B that works (course type detection, experiment lists, YouTube caching, Virtual Labs links, lesson flags, simulation templates). Reuse Prism's theory lesson visual system and interactives. Don't regenerate all lab lessons in bulk (see "Rollout" below).

### 1. Lab archetypes

Create a small set of lab lesson formats ("archetypes"), each with its own section list. Put them in one config file so I can edit them later. Starting set:

**A. Circuit / electrical / electronics lab** (Applied Physics circuit experiments, Electrical, ECE, digital electronics)
Aim, theory with formulas, apparatus/components, circuit diagram (see section 2), step-by-step wiring, procedure, observation table (blank + filled sample), calculations, graph if the experiment has one, result, precautions and sources of error, viva questions, simulation, videos.

**B. Physics / mechanics experiment without circuits** (pendulum, optics, Young's modulus etc.)
Same as A, but with a labelled apparatus/setup diagram instead of a circuit, and a matching simulation template.

**C. Programming lab** (C, Python, Java, Data Structures, OOP, DBMS/SQL, web, OS shell, etc.)
No aim/apparatus/observation table. Instead: language and topic, short concept recap, 2 to 4 code examples (simple to harder) each with line-by-line explanation and expected output, a dry-run/trace visual for at least one example (variables changing step by step, memory/pointer diagram where relevant), common errors and how to fix them, 2 to 3 practice problems with hidden solutions, viva questions, videos.
Where it's free and runs in the browser, add a "Run this code" box: Python via Pyodide, JavaScript natively, SQL via sql.js. For C/C++/Java, show the code and expected output only (no paid code-execution APIs).

**D. Chemistry / chemical engineering wet lab**
Aim, principle with reaction equations, chemicals and apparatus, safety precautions (highlighted), procedure, observation table, calculations, result, sources of error, viva questions, simulation (e.g. titration, colour change), videos.

**E. Biotech / biology lab**
Aim, principle, reagents and equipment, protocol steps, biosafety notes, expected observations (with labelled diagrams), result interpretation, viva questions, videos.

**F. Workshop / manufacturing lab** (fitting, carpentry, welding, machining)
Tools and machines (labelled diagrams), safety, job drawing with dimensions, sequence of operations as an animated step-through, measurement and inspection, viva questions, videos.

**G. Engineering Graphics / drawing / CAD lab**
Problem statement, construction steps animated one line at a time on the drawing (like watching someone draw it), key rules and conventions, common mistakes, CAD commands if it's a CAD lab, practice problems, videos.

**H. Civil / material testing / surveying lab**
Aim, relevant IS code (name and number only, don't quote text from it), apparatus, procedure, observation table, calculations, result compared with standard limits, precautions, viva questions, videos.

**I. Hardware / microcontroller / IoT lab**
Components, wiring/pin diagram (using the circuit renderer from section 2), code with explanation, expected behaviour, troubleshooting, viva questions, videos.

**J. Communication / language / soft-skills lab**
Activity goal, key concepts, examples, practice activity, self-check questions.

**Fallback:** if no archetype fits, use a generic format and log the lab in `docs/LAB_ARCHETYPE_GAPS.md`.

**Classification:** assign an archetype to every lab course, using the course name, branch and experiment list. Allow a per-experiment override (e.g. a physics lab where one experiment has a circuit and another doesn't). Write `handouts/_parsed/LAB_ARCHETYPES.md` listing every lab course with its archetype and anything uncertain, so I can check it.

### 2. Proper circuit diagrams

For every experiment that uses a circuit:

- **Don't let the AI draw circuit SVGs from scratch.** Have it output the circuit as structured data: a list of components (type, label, value) and a list of connections (from component terminal to component terminal). Then render it with one reusable, well-tested circuit renderer using standard symbols.
- **Validate before showing:** every component connected, no floating wires, ammeters in series, voltmeters in parallel, polarity marked for DC sources, meters and diodes. If validation fails, retry once, then fall back to a labelled static diagram and log it.
- **Two views:** a clean circuit diagram, and a "connection view" showing each wire going from where to where, like on a real lab bench.
- **Step-by-step wiring:** each procedure step highlights the exact connection it makes ("Connect the positive terminal of the battery to terminal A of the rheostat"), building the circuit up wire by wire, with next/back buttons.
- **Interactive:** students can change values (voltage, resistance, current, frequency) and see meter readings and graphs update live, at least as good as the interactives in theory lessons.
- Evaluate free, open-source options first (for example embedding Falstad's CircuitJS for live simulation, or a small SVG schematic renderer of our own) and tell me which you picked and why. No paid libraries or APIs. Must work on phones.

### 3. Better simulations for all labs

The interactive diagrams in labs should match the quality of the ones in theory lessons. Upgrade the Phase 7B simulation templates where they're weak, using the same visual style and components as theory lessons: smooth animation, clear labels, sliders for parameters, live readouts and graphs.

### 4. Rollout (save tokens and API calls)

1. Build the archetypes, the circuit renderer and the upgraded templates.
2. Generate ONE sample lesson for each archetype, including Applied Physics Lab (circuit experiment) and Computer Programming Lab from COMP sem 1, since I can check those myself. Tell me exactly where to see them.
3. Stop and wait for my feedback.
4. After I approve, mark all existing lab lessons as `stale` so each one regenerates in its new format only when a student next opens it. Don't regenerate them in bulk.

When done: run the build and full check, update the audit log, then ask me to commit and push.

### Phase 7C fixes (owner feedback, 2026-10-29): do these next

The 10 samples were built, but the owner found two gaps in the Applied Physics lab. Phase 7C is not finished until these are done. Reuse what exists (`src/lib/labs/circuit/*`, `src/components/labs/circuit/*`, `ApparatusDiagram.tsx`, `ProcedureSteps.tsx`, `src/visuals/labs/*`, theory widgets in `src/visuals/wave1`, `wave2`, `widgets`).

1. **Procedure diagrams.** The Procedure section itself must show a diagram for every step, not only a separate wiring section.
   - Circuit experiments (archetype A, and I where a circuit exists): each procedure step shows the circuit and highlights what that step does (wires added, knob turned, meter read), building up with next/back. Link the `steps` section to the `circuit` section in `archetypes.json` and let a step point at circuit connections or components.
   - Physics without circuits (archetype B): replace the old tile-and-arrow setup diagram with a proper drawn setup (parts in their real positions, e.g. lamp, lens, screen on an optical bench), highlighting the parts each step uses. Same for other archetypes that use `setup` diagrams.
2. **Upgrade the lab simulation templates** (section 3 above, missed the first time). The widgets in `src/visuals/labs/` (ThinLens, Oscillation, Titration, HeatExchanger, FlowMeter, Oscilloscope, CoilField) are unchanged since Phase 7B. Bring each up to theory-lesson quality: smooth animation, clear labels, sliders, live readouts and a live graph.
3. **Check:** regenerate ONLY Applied Physics experiments 6 (solar cell) and 11 (wavelength) (2 AI calls) and tell the owner where to see them on `http://localhost:3000` (the owner runs `npm run dev`). Then stop for feedback again.
   Status 2026-10-30: steps 1 to 4 done (rollout switch off after the owner's OK). Phase 8 is next.

4. After the owner approves: rollout switch (`LAB_CONFIG.keepPhase7BLessons` = false), build and full check, audit log, ask to commit `Syllabus fix: Phase 7C, lab lessons v2` and push. Then Phase 8.

---

## Phase 8: Test everything

1. Recreate the two real bugs and prove they're fixed:
   - ICT student's semester shows all 6 subjects, including AI, at the top of search.
   - The Mechanical chapter shows the correct topics, and chapters sit in the right semester.
2. Test the full flag flow with 2 or 3 fake test accounts: flag, confirm prompt, auto-apply, revert from admin.
3. Test a conflicting handout pair lands in the conflicts queue.
4. Check existing user data is untouched (progress, weak topics, mock tests, highlights).
5. Run the build and fix any errors. Make sure it still deploys on Vercel's free tier.
6. Write `docs/SYLLABUS_SYSTEM.md`: a plain-English explanation of how the whole system fits together, with one everyday analogy, for me to read and learn from.
7. Phase 8 extra tests (practical add-on):
   - Check a few practical courses from different branches: the course type is right, experiments are listed in order, and each lesson has all 11 sections.
   - Test at least one magnetic field experiment with the coil simulation (moving one coil, moving both).
   - Check video caching works (second page view makes no API call) and that a flagged video gets replaced.
   - Check simulations work on a phone-sized screen.

Also test the lesson flag flow: 4 test accounts flag one lesson, it regenerates as a new version with the feedback, and a second round of flags sends it to the admin queue instead of regenerating again.

Final summary: what's done, what's left, and any config numbers I should tune once real students start using it.

Status 2026-10-30: Phase 8 done, waiting for the owner's review (details in the audit Progress Log). The Mechanical bug needed one more fix (migration 011, handout re-check).

---

## Out of scope for this task: accuracy evals

Do **not** run, write or change any accuracy tests (evals) for Prism's lesson maker in this task.

- The accuracy tests done for the previous version were based on the old syllabus. Since this task changes the syllabus, those results are now outdated.
- I'll redo all the accuracy evals later, for every subject, in a separate prompt in a later version.
- Don't delete or edit the existing eval files, scripts or results. Just leave them as they are, and note in the audit file and in `docs/SYLLABUS_SYSTEM.md` that the evals are outdated and need to be redone after this syllabus fix.
- The tests in Phase 8 are only for checking that the new features work, not for measuring lesson accuracy.
