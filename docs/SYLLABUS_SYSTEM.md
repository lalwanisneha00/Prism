# How Prism's syllabus system works

A plain-English guide to the syllabus fix (Phases 0 to 8, October 2026). Read this to understand what was built and how the pieces fit together. Technical working notes are in `docs/SYLLABUS_AUDIT.md`; the original plan is `PRISM_SYLLABUS_FIX.md`.

## The big picture in one analogy

Think of a **printed bus timetable at a bus stop**.

- The transport office prints the timetable once (the **official course handouts**, imported into Prism's data files). Prism never tears it down and reprints it from scratch; when something is wrong it is corrected, not replaced.
- Riders who notice a mistake (a bus listed at the wrong time) stick a **note** on the board: "the 8:15 doesn't run on Sundays". That is a student **flag**, or a student **uploading their own handout**.
- One note is not enough. When enough riders **from that same route** agree, a neat **correction sticker** goes over the timetable. That is the **live overlay**: every student now sees the fixed version.
- If two groups of riders stick opposite notes (one says 8:15, another says 8:30), nobody gets a sticker. The **station manager** (the admin) decides.
- The manager can also **peel off any sticker** (revert), and a rider whose notes keep being peeled off stops counting.
- The bus numbers never change, even when a route moves. That is why every student's saved progress keeps working: Prism links progress to **ids**, and ids are never renamed.

## The layers, from bottom to top

1. **Course data (the printed timetable).** Every course is a JSON file in `src/data/subjects/pdeu-*.json`: chapters, topics, which branches and semesters take it. It is built into the app, so it costs nothing to read.
2. **Handout import (Phase 2).** Scripts read the 2024-25 handout PDFs in `handouts/`, compared them with the data and **moved** things into place (topic to the right chapter, course to the right semester), added what was missing and **hid** (never deleted) what no handout lists. Every change is a numbered, reversible **migration** in `scripts/syllabus-migrations/` (001 to 011) and is written to `data/university/pdeu/history.jsonl`.
3. **Admin corrections.** The owner's own decisions (migrations 005 to 010), for example merging the per-branch copies of first-year courses into one shared course. Old copies stay reachable through **aliases**, so progress saved on them still counts.
4. **Student fixes (the stickers).** Applied fixes live in one small Firestore document, `syllabusOverlay/current`, which the app lays over the course data when it loads (one cached read per visit).
5. **What the student sees.** Course lists, the search box, chapter pages, lesson picker and planner all read "data + overlay".

## Rules that protect students' data

- **Ids never change.** Moving a topic changes where it sits, not its id. A topic that moved remembers where it came from (`movedFrom`, `formerChapters`), so old links still open.
- **Nothing is deleted.** Things that are wrong are hidden (`status: "retired"`). Hidden topics still open from an old link.
- **No bulk rewrites of lessons.** When a topic moves or changes, it is marked **stale**. Its lesson is rewritten only when a student next opens it, with a short "Updating this lesson to match your syllabus" message.
- **Student records are never edited.** Progress, weak topics, mock tests, highlights, notes and saved lessons stay exactly as stored on the device and in Firestore. Only the course data around them changes. `npm run syllabus:check` proves every saved id still resolves (23,021 locked ids at Phase 8).

## How a student fixes the syllabus

| What the student does                                                                                         | Where                                         | Worth                             |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | --------------------------------- |
| Flags a course, chapter or topic ("wrong semester", "topic not in my syllabus", "chapter missing" and 6 more) | Flag icon on the course page and chapter rows | 1 point                           |
| Uploads their course handout                                                                                  | Banner on unverified courses                  | 3 points per difference           |
| "My subject isn't here"                                                                                       | Under the semester list                       | 1 point                           |
| Answers an "Is this right?" prompt from classmates                                                            | Semester page, once per visit                 | Agree +1, Disagree -1, Not sure 0 |

**When does a fix go live?** When it has **3 points from at least 2 students of the same branch and semester** (`src/lib/syllabusFix/config.ts`). Identical suggestions from different students add up, because each suggestion gets an id made from what it changes.

**What never goes live on its own:** new courses, moving a chapter to another course, a missing chapter and duplicate courses. These go to the admin's **review** queue. If two opposite suggestions both have 2 or more points, both go to the **conflicts** queue.

**Admin page:** `/admin/syllabus` (only the account in `ADMIN_UID`). It shows recent live fixes in plain words (revert button), conflicts (approve one side or reject both), the review queue, suggestions close to going live, how much of each branch students have verified, and lessons under review.

**Safety limits:** per student per day: 20 flags, 5 handouts, 5 missing-subject reports, 40 votes, 20 lesson flags. A student with 3 reverted fixes is paused until the admin resumes them.

**Trust badges and thanks:** courses show "Verified by N students from <Branch>" or "From official website, may be outdated. Help verify?". A student whose fix went live is told so, and their account page counts their fixes.

## Lessons

- **Theory lessons** are shared in the Firestore lesson library, one per topic, level and length.
- **Lesson flags:** when **4 students** flag one lesson (wrong fact, wrong formula, broken visual, confusing, …), the next student who opens it gets a rewritten lesson. The students' reports go into the AI's instructions as quoted data, and the old version is kept. If the new version is flagged again by 4 students, it is **not** rewritten again: it goes to the admin, and students see an "under review" note.
- **Lab lessons (Phases 7B and 7C):** each lab course gets a format that suits it ("archetype", `src/data/labs/archetypes.json`): circuit lab, physics lab, programming lab (with a "Run this code" box for Python, JavaScript and SQL), chemistry, biology, workshop, drawing/CAD, civil testing, hardware/IoT and communication, plus a general one. Circuits are drawn by Prism's own renderer from a list of parts and wires, checked before showing (ammeters in series, voltmeters in parallel, nothing floating), with step-by-step wiring and live meter readings. Simulations come from a library of tested templates (for example the coil field: move one or two coils and watch the field change); the AI only picks one and fills in values.
- **Videos:** found once per experiment with the free YouTube Data API, trusted channels first, then cached. 3 students saying "video doesn't match" hides it and the next best takes its place. Needs `YOUTUBE_API_KEY` (not set yet).

## Where things live

| Thing                              | Location                                                                                                                                                                                                                                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Course data                        | `src/data/subjects/pdeu-*.json` (index built by `scripts/build-subject-index.mjs`)                                                                                                                                                                                                                     |
| Handbook view (credits, electives) | `src/data/pdeu/*.json`                                                                                                                                                                                                                                                                                 |
| Parsed handouts and reports        | `handouts/_parsed/` (PDFs are not committed)                                                                                                                                                                                                                                                           |
| Migrations and change history      | `scripts/syllabus-migrations/`, `data/university/pdeu/history.jsonl`, `data/university/pdeu/migrations/`                                                                                                                                                                                               |
| Stale topics, aliases              | `src/data/syllabus/stale-topics.json`, `src/data/syllabus/aliases.json`                                                                                                                                                                                                                                |
| Rules (pure logic, tested)         | `src/lib/syllabusFix/` (flags, voting, overlay, badges, lesson review, handout re-check), `src/lib/labs/`                                                                                                                                                                                              |
| Numbers you can tune               | `src/lib/syllabusFix/config.ts`, `src/lib/labs/config.ts`                                                                                                                                                                                                                                              |
| Firestore (server writes only)     | `syllabusProposals` (+ `votes`), `syllabusFlags`, `syllabusHandouts`, `syllabusOverlay`, `syllabusHistory`, `syllabusCredits`, `syllabusTrust`, `syllabusUsage`, `syllabusAdmin`, `lessonFlags`, `lessonStatus`, `lessonVersions`, `lessonQuality`, `labVideos`, `labSimulations`, `labSimulationGaps` |

Browsers cannot read or write any of these Firestore collections; only Prism's server can (the existing catch-all rule).

## How to check it still works

| Command                                                                                       | What it proves                                                                                                         |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `npm run check`                                                                               | Types, lint, format and all unit tests, including the Phase 8 stories below                                            |
| `npm run build`                                                                               | The production build Vercel runs                                                                                       |
| `npm run syllabus:check`                                                                      | Every saved id still opens; aliases and links are valid                                                                |
| `npx tsx --tsconfig tsconfig.json scripts/syllabus-migrations/011-handout-recheck.ts dry-run` | Compares every course with its handout again; lists anything still out of place (`handouts/_parsed/RECHECK_REPORT.md`) |
| `npx playwright test e2e/labs.spec.ts --project=mobile-light`                                 | The coil simulation works on a phone-sized screen                                                                      |

Phase 8 tests (in `npm run check`):

- `src/lib/syllabusFix/phase8.test.ts`: the two real bugs (ICT semester 3 lists all 6 courses with AI first in search; every Mechanical course agrees with its handout and sits in the right semester), lab experiments in order, one lab per branch gets a complete lesson format.
- `src/app/api/syllabus/phase8.test.ts`: three students flag → prompt → Agree → live → admin reverts; two disagreeing handouts land in the conflicts queue.
- `src/app/api/lesson/flagLoop.test.ts` and `src/app/api/practical/route.test.ts`: 4 flags → one rewrite with the students' feedback → a second round goes to the admin.
- `src/lib/labs/videos.test.ts`: the second page view makes no YouTube call; a video flagged by 3 students is replaced.

## Numbers to tune once real students use it

| Setting                            | Now       | Raise it if…                            | Lower it if…                                                   |
| ---------------------------------- | --------- | --------------------------------------- | -------------------------------------------------------------- |
| Go live: points / students         | 3 / 2     | wrong fixes go live                     | correct fixes wait too long                                    |
| Conflict when the rival has        | 2 points  | too many conflicts for one stray flag   | the admin misses real disagreements                            |
| Handout worth                      | 3 points  | n/a                                     | one handout is enough to push a change through with one friend |
| "Is this right?" prompts per visit | 1         | fixes wait for confirmation             | students find it annoying                                      |
| Lesson flags before a rewrite      | 4         | lessons are rewritten for little reason | bad lessons stay up too long                                   |
| Daily limits                       | see above | real students hit them                  | someone is spamming                                            |
| Pause after reverted fixes         | 3         | n/a                                     | a bad actor does damage before the pause                       |
| Overlay cache                      | 300 s     | Firestore reads get close to 50,000/day | students wait too long to see a fix                            |
| Videos shown / hidden after flags  | 3 / 3     | n/a                                     | n/a                                                            |

## Known gaps (October 2026)

- **Accuracy evals are outdated.** They were run on the old syllabus. They were not run or changed in this task and must be redone for every subject later.
- `YOUTUBE_API_KEY` is not set, so lab pages say videos are not switched on yet.
- The handout re-check (Phase 8) fixed only clear cases. The dry run still suggests a few changes it was not sure about (some chapter orders, renamed chapters, five first-year course placements in COMP and ELEC, some of which would undo the owner's corrections 006 to 009). See `handouts/_parsed/RECHECK_REPORT.md` and `npm run syllabus:needs-review`.
- Three merged first-year labs list an experiment from another branch's handout with that handout's number, so a number can appear twice (for example two "2." in Elements of Electrical and Electronics Engineering Lab).
- Not tested against the real Firestore in Phase 8 (in-memory stand-ins were used): a real signed-in flag, prompt, vote and revert. Try it once on the deployed site with two accounts.
