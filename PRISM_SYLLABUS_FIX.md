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

## Phase 8: Test everything

1. Recreate the two real bugs and prove they're fixed:
   - ICT student's semester shows all 6 subjects, including AI, at the top of search.
   - The Mechanical chapter shows the correct topics, and chapters sit in the right semester.
2. Test the full flag flow with 2 or 3 fake test accounts: flag, confirm prompt, auto-apply, revert from admin.
3. Test a conflicting handout pair lands in the conflicts queue.
4. Check existing user data is untouched (progress, weak topics, mock tests, highlights).
5. Run the build and fix any errors. Make sure it still deploys on Vercel's free tier.
6. Write `docs/SYLLABUS_SYSTEM.md`: a plain-English explanation of how the whole system fits together, with one everyday analogy, for me to read and learn from.

Also test the lesson flag flow: 4 test accounts flag one lesson, it regenerates as a new version with the feedback, and a second round of flags sends it to the admin queue instead of regenerating again.

Final summary: what's done, what's left, and any config numbers I should tune once real students start using it.

---

## Out of scope for this task: accuracy evals

Do **not** run, write or change any accuracy tests (evals) for Prism's lesson maker in this task.

- The accuracy tests done for the previous version were based on the old syllabus. Since this task changes the syllabus, those results are now outdated.
- I'll redo all the accuracy evals later, for every subject, in a separate prompt in a later version.
- Don't delete or edit the existing eval files, scripts or results. Just leave them as they are, and note in the audit file and in `docs/SYLLABUS_SYSTEM.md` that the evals are outdated and need to be redone after this syllabus fix.
- The tests in Phase 8 are only for checking that the new features work, not for measuring lesson accuracy.
