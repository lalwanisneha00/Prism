# Prism — final overnight run: finish V3, add four features, polish

I am asleep. You are working alone until morning. I have to deploy this web app tomorrow evening, so the branch must be in a working, polished, deployable state when I wake up. Read this whole file before doing anything.

---

## 0. First actions, in this order

1. **Schedule your own check-in.** Create a recurring scheduled task that fires **every 30 minutes** with exactly this prompt:

   > Overnight check-in. Read the "Current state" block in PROGRESS.md and run `git status` and `git log -3`. If work is in progress and healthy, continue it. If work stopped for any reason, find out why (usage limit, network error, failed command, out of memory, crashed process), fix or route around it, and resume from the recorded next action in PRISM_OVERNIGHT_FINAL.md. Never start a finished step again. Do not ask me anything.

   Confirm the task ID in one line. If scheduling fails, say so in `MORNING_REPORT.md` and carry on.

2. Create a new branch `overnight-v3-final` from the current working branch, and tag the starting point `before-overnight-final`.
3. Start a fresh section at the top of `MORNING_REPORT.md` for tonight.
4. Add the new work in this file to `SPEC.md` and `PROGRESS.md` as numbered steps, then begin.

---

## 1. You must not stop

1. **Never pause, never ask me a question, never wait for confirmation.** Make every decision yourself. Record each decision in one line in `MORNING_REPORT.md`.
2. **Keep working until every step in section 3 is finished** or genuinely impossible. Finishing a step is not a reason to stop; go straight to the next one.
3. **When something fails, find another route.** Do not stop on an error. Diagnose it, try a different approach, and only after three real attempts mark that one item as skipped with the reason, then move to the next item that doesn't depend on it.
4. **Usage limit:** before a limit is reached, update the "Current state" block in `PROGRESS.md` and commit. Wait in this open session and continue the moment the limit resets, from the recorded next action.
5. **Network error:** try again after 5 minutes. If it still fails, try again after another 5 minutes. Keep trying every 5 minutes until it works; my Wi-Fi may drop once or twice for 5 to 15 minutes. While the network is down, keep doing work that needs no network (code, tests with mocks), commit locally, and push when it returns.
6. **Memory problems.** Last night the run stopped because of a memory overload. That must not happen again:
   - Run heavy commands one at a time, never in parallel. Stop dev servers, browsers and watchers as soon as a test run ends.
   - Run tests in small batches. Use one Playwright worker. If Node runs out of memory, raise `NODE_OPTIONS=--max-old-space-size` moderately and split the work.
   - Process large data (syllabus files, eval sets, fixtures) in chunks, with progress saved per item.
   - Keep your own context lean: read large files in parts, don't print long logs or whole files into the conversation, keep summaries in `PROGRESS.md`, and use a subagent for large searches.
   - If a command is killed or the machine is slow, lower the load and retry. Never repeat the same heavy command unchanged.
7. **Save constantly.** Update the "Current state" block in `PROGRESS.md` and commit after every meaningful unit of work, with a git tag after each finished step.
8. **End every turn with a short status block** in the conversation: steps done, step in progress, steps remaining, and the result of the latest build and test run. This is how progress is judged.

## 2. Safety rules

1. Work only on `overnight-v3-final`. Do not merge into `main` and do not change the production deployment. Push the branch so there is a Vercel preview.
2. No destructive commands: no force push, no `git reset --hard` on pushed history, no deleting branches or user data.
3. Do not print or change secrets. Do not change live Firebase security rules; write proposed rules to `firestore.rules.proposed` and list them under "Needs Sneha".
4. Nothing paid. No Cloud Functions and no Firebase Storage (both need a paid plan). If something would cost money, use a free alternative or skip it and say so.
5. Storage schema changes need a migration; never wipe saved data.
6. Automated tests use mocked AI responses. Live AI calls are only for the accuracy eval, rate-limited, cached and resumable.
7. Existing features must keep working. Run the regression suite after each feature. Electricity & Magnetism and Engineering Maths must stay at 95% or above.
8. **Every new feature below goes behind its own feature flag** in one config file, so I can switch any of them off before deploying without touching code.

---

## 3. Work order

Do these strictly in order. Each one must leave the branch building and passing tests before the next begins.

1. Finish every unfinished V3 step already in `SPEC.md` and `PROGRESS.md`, including the personalised time recommendations and planner upgrade.
2. Feature A — Bring your own API key
3. Feature B — Slides and PDF generator
4. Feature C — Interface redesign
5. Feature D — Community branches
6. Final polish and deploy preparation

If time runs out, earlier items matter more than later ones. Never leave a half-built feature switched on: finish it, or switch its flag off and note it.

---

## 4. Feature A — Bring your own API key

When many people use Prism at once, my shared key runs out. Each user should be able to use their own key.

**Do not put user keys in `.env.local`.** That file is one shared server setting for the whole app and cannot hold per-user values. Per-user keys work like this:

1. **Settings → "Your API keys"** page. Providers: Google Gemini, Groq, OpenAI, Anthropic, xAI (Grok), and OpenRouter. For each: a key field, a model picker, a "Test key" button, and a link to where the user gets a key, marking which providers have a free tier.
2. **Storage:** keys are saved only on the user's device (IndexedDB), never in Firestore, never in backups or exports, never in shared links, never logged. Show a plain note saying so, and a "Remove key" button.
3. **Use:** the key is sent over HTTPS with each lesson request to our server route, used for that request only, and never stored or logged on the server. Redact keys from all error messages and logs.
4. **Adapters:** extend the existing `llm/` adapter. One OpenAI-compatible adapter covers OpenAI, Groq, xAI and OpenRouter by changing the base URL; add an Anthropic adapter; keep Gemini. Every provider must return the same validated lesson JSON, with the existing retry on invalid JSON.
5. **Order of use:** the user's chosen key first. If it fails (invalid, out of quota, provider down), show a clear message and offer to retry with the shared free key. With no user key, the shared key is used as today.
6. **Explain it honestly in the UI:** a paid chat subscription (Claude Pro or Max, ChatGPT Plus, Gemini's paid app) is **not** an API key and cannot be used here. Only API keys work, and paid keys are billed to the user by that provider.
7. **Accuracy stays the same:** grounding, the verifier pass and all code checks run whatever the provider. Record the provider and model on each lesson. A lesson enters the shared library only if it passes verification and came from public sources.
8. Show a small "Using: your Gemini key" or "Using: Prism's shared key" indicator where lessons are generated.

---

## 5. Feature B — Slides and PDF generator

Add an optional panel in the "make my lesson" section: **"Make slides or a PDF instead"**. When it is chosen, produce only that file (no lesson page), though it is built from the same grounded, verified lesson content.

### Options

1. **Purpose:**
   - **For teaching:** a presentation for a teacher or a student presenting to class. Clear slides, speaker notes on every slide (what to say, a question to ask the class, rough timing), an activity or discussion slide, and a recap.
   - **To study from:** fuller explanations, analogies, worked examples step by step, common mistakes.
   - **For revision:** compact. Key points, formulas, a concept map, mnemonics, quick questions with answers.
   - Also offer: **Practice sheet** (questions, then answers at the end) and **One-page summary**.
2. **Format:** PowerPoint (.pptx) or PDF.
3. **Length:** a rough slide count the user picks (for example 10, 15, 20, 30 or a custom number). Treat it as approximate: the result may be up to about 6 slides more or fewer, whatever teaches the topic best. For PDF, show the equivalent in pages.
4. **Level** and **topic, several topics or a whole chapter** work as they do for lessons.
5. **Look:** the user picks one of the designed themes (below).

### Content

1. Everything a lesson has: explanations, analogies, the concept map, worked examples, misconceptions, charts, diagrams, images and a sources slide with citations and image licences.
2. **Interactive visuals become a sequence of still images.** For each interactive widget or simulation, render several fixed states to images (for example: the starting position, a changed value, the limiting case), each with a caption saying what changed and what to notice, so the stills teach what the interaction taught.
3. Charts, plots, Mermaid diagrams and formulas are rendered to crisp images or native shapes. Check that every formula renders correctly.
4. Include **more** visuals than text slides where they help. One idea per slide, no walls of bullets (five short points at most), and a spoken explanation in the notes rather than paragraphs on the slide.
5. The slide plan is a validated JSON outline produced first (slide type, title, content, visual), then rendered. Reuse the visual rules: the AI never draws, data is computed, sourced or labelled illustrative.

### Design: it must look made by a person

1. Build **four distinct, carefully designed themes**, not default templates. Each has its own colour palette, type pairing, title style, spacing and a small recurring design detail. No default purple or blue gradients, no stock template look, no clip-art, no emoji as icons.
2. Vary the layouts through a deck: title, section opener, big statement, image-led, two-column, step-by-step, comparison table, diagram full-width, worked example, quiz, recap. Never the same title-and-bullets layout slide after slide.
3. Consistent margins and alignment, real visual hierarchy, good contrast, readable from the back of a classroom.
4. Use fonts that exist on Windows, macOS and Google Slides, so the deck does not fall back to a default font when opened.
5. PowerPoint files must be properly editable: real text boxes, real tables, images as images, speaker notes in the notes pane. Not screenshots of slides.
6. PDFs are laid out as designed pages with selectable text, page numbers and a contents page for long ones. The PDF is not a print of the web page.

### Technical

1. Generate in the browser with free libraries (for example pptxgenjs for .pptx and a real PDF layout library for PDF). Lazy-load them.
2. Show progress while building, and save generated files to a "My slides and PDFs" list so they can be downloaded again.
3. Test: generate each purpose in both formats, open the .pptx output programmatically to confirm slide count is within range, notes exist for teaching decks, no empty slides, no overflowing text, and all images are present.

---

## 6. Feature C — Interface redesign

The current look (purple-toned, in light and dark mode) is generic and reads as AI-made. Redesign the look completely. **Change only how it looks. Do not change any feature, behaviour, data or logic.**

### How to do it safely

1. Do it through the design layer: design tokens (colours, type, spacing, radius, shadows), shared UI components and layout styles. Do not rewrite feature logic, storage, API routes or state.
2. Before starting, capture screenshots of every main screen. After finishing, capture them again and put both sets in `MORNING_REPORT.md`.
3. All existing automated flow tests must pass unchanged. If a test needs changing because of a selector, keep its meaning identical.
4. Keep the old theme available as a "Classic" option behind the flag, so I can switch back if I prefer it.
5. Commit the redesign as its own series of commits so it can be reverted without losing other work.

### Design direction

Make it look like a product designer built it for students, with a clear point of view. If you have a frontend design skill, use it.

1. **Identity from the name.** Prism: white light split into a spectrum. Use a calm, mostly neutral interface where the spectrum appears only with meaning: the six learning levels each own one spectrum colour, used consistently everywhere that level appears. Colour as information, not decoration.
2. **Light mode:** a warm paper-like background with deep ink text, not pure white and grey. **Dark mode:** a deep ink tone, not pure black and not purple.
3. **Typography with character:** a distinctive display face for headings paired with a highly readable text face for long study sessions. Generous line height and comfortable reading width for lessons. Free fonts only, self-hosted or from Google Fonts.
4. **Remove the AI-app clichés:** no purple-to-blue gradients, no glowing blobs, no glass panels, no gradient text, no sparkle icons, no emoji as interface icons, no identical rounded cards in a grid on every page.
5. **Layout with intent:** a clear hierarchy on each screen, one primary action, real use of whitespace, varied section rhythm. The lesson page should feel like a well-set textbook page; the dashboard like a study desk, not an analytics panel.
6. One consistent icon set, subtle purposeful motion only (respecting reduced-motion), clear focus states, and contrast that meets accessibility guidelines in both modes.
7. Charts, the concept map, highlights and status colours get a palette that fits the new look and stays distinguishable for colour-blind users.
8. Works at 375px mobile width through to wide desktop.

---

## 7. Feature D — Community branches

Prism's built-in syllabus covers the common Indian B.Tech and B.E. branches. Students elsewhere, or in branches we don't list, should be able to build their own branch section, share it, and form a community around it. The best-rated, most-used version of a branch should be the one recommended to others.

### 7.1 What is shared

Only the **syllabus structure**: branch → years or terms → subjects → chapters → topics, with prerequisite links and optional importance marks, plus a description and optional links to openly available resources. **Never** shared: uploaded files, text extracted from them, lessons built from private uploads, or any personal progress. Say this clearly at the publish step, with a reminder not to paste copyrighted course material.

### 7.2 Creating a branch (guided, in steps)

1. **Basics:** branch name, degree, country, university (optional), language, and how the course is divided (semesters, terms, years, or none) and how many.
2. **Add subjects**, any mix of:
   - **Paste or upload a syllabus** (any supported format); Prism turns it into subjects, chapters and topics for the user to review and edit
   - **Reuse an existing subject** from the built-in library or another community branch (for example Engineering Maths), linked rather than copied
   - **Start from a similar branch** as a template
   - **Type it in** with a fast outline editor (indent to nest, drag to reorder, bulk paste)
3. **Check:** Prism flags empty chapters, duplicate topics, and prerequisite loops.
4. **Publish as:** Private (only me), Invite link (anyone with the link), or Public (listed in the directory).

### 7.3 Community

1. Anyone signed in can **join** a branch. Joining adds it to their subjects; later updates by the maintainers reach members, who see what changed.
2. **Roles:** owner, co-maintainers the owner invites, members. Members can **suggest edits** (add or fix topics); maintainers accept or decline. A version history lists changes.
3. **Make my own copy:** anyone can copy a branch and adapt it, with credit to the original.
4. A branch page shows: description, university and country, member count, rating, number of subjects and topics, last updated, maintainers' display names, and reviews.

### 7.4 Ratings and reviews

1. Signed-in members can rate 1 to 5 and write a short review. One review per person per branch, editable. To review, the member must have used the branch (generated at least one lesson from it).
2. Reviews show a display name the user chooses, never an email address.
3. Each review and each branch has a **Report** button.

### 7.5 Search and recommendation

1. A directory with search by branch name, university, country and subject, with similar-name matching (for example "printing engineering" also finds "print technology").
2. **Ranking:** when several communities cover the same or a similar branch, rank them by a fair score combining rating, number of reviews and number of members, so one five-star review cannot outrank a well-reviewed large community. Use a weighted (Bayesian) average, with a small boost for recent activity and for an exact match on university or country. The top one is marked **Recommended**; the others remain visible beneath it.
3. Show the built-in branches alongside community ones, clearly labelled "Official" and "Community".

### 7.6 Accuracy and trust

1. Lessons for community subjects use the normal pipeline. They start at the `sourced` or `limited` tier and are never shown as `tested` or `verified`.
2. Mark community content clearly as made by students, not checked by Prism.

### 7.7 Abuse protection (required before this can be public)

1. All text is stored and shown as plain text. No HTML, no scripts. Length limits everywhere. Links are allowed only in the resources field and are validated.
2. Per-user limits: a few new branches per day, a cap on edits and reviews per hour, enforced on the server.
3. A basic blocked-words filter on names, descriptions and reviews.
4. An item with several reports is hidden automatically until reviewed.
5. A simple **admin page**, visible only to the user IDs listed in an `ADMIN_UIDS` environment variable, listing reported items with hide, restore and delete actions.
6. A short community guidelines note, shown when publishing and reviewing.

### 7.8 Technical

1. Store in Firestore within the free limits: a small document per branch (details plus counters), subjects as separate documents under it (each under 1 MiB), and separate collections for members, reviews, suggestions and reports.
2. **All community writes go through our Vercel API routes** using the Admin SDK: verify the Firebase sign-in token, validate, rate-limit, and update the counters (member count, rating total, review count) in a transaction. Clients cannot write these directly.
3. Keep reads low: paginate the directory (20 at a time), cache results, load a branch's subjects only when opened, and use stored counters instead of counting documents.
4. Search without a paid service: store lowercase keyword tokens on each branch document and filter on those, with fuzzy matching on the client over the returned page.
5. Write the security rules to `firestore.rules.proposed` and list "apply these rules in the Firebase console" under "Needs Sneha", with click-by-click steps. Until the rules are applied, keep this feature's flag **off**.
6. Works for any country: no assumption of semesters, AICTE, or Indian grading.

---

## 8. Final polish and deploy preparation

1. **Full bug sweep:** go through every main flow on desktop and at 375px, in light and dark mode: sign-in, topic picker, single lesson at each level, chapter lesson, audio, uploads in each format, "Other subjects", concept map, highlights and comments, flashcards, mock test, planner, export, slides and PDF, API keys, and community if finished. Fix every error found.
2. Zero console errors and zero failed network calls in normal use. No broken layouts, overflowing text, or missing loading, empty and error states.
3. Full regression: build, lint, type-check, all unit tests, all browser tests, and the accuracy eval as quota allows.
4. Performance: lazy-load heavy libraries, check bundle size, and reach a Lighthouse score of 90 or more on the main pages where possible.
5. Remove dead code, debug logs and leftover test routes. `/dev` pages stay out of production navigation.
6. Update the README with what Prism is, the feature list, screenshots and how to run it.
7. Write **`DEPLOY_CHECKLIST.md`** for me: how to review the preview, how to merge `overnight-v3-final`, every environment variable Vercel needs (names only), the Firebase rules to apply and the authorised domains to add, which feature flags are on or off and my recommendation for each at launch, and a five-minute smoke test to run on the live site.

---

## 9. MORNING_REPORT.md

Keep it updated as you go, newest first:

1. **Summary:** done, in progress, not started, with the feature flag state of each new feature.
2. **How to see it:** branch, preview URL, commands.
3. **Per finished step:** what was built, test results, and a "✅ Check this" list for me.
4. **Before and after screenshots** of the redesign.
5. **Decisions made without me,** one line each.
6. **Needs Sneha:** everything only I can do, with exact steps.
7. **Problems:** anything that failed, was skipped or reverted, and why.
8. **Accuracy:** eval scores, and which subjects are waiting on quota.
9. **Interruptions:** each usage limit, network drop or memory problem, when it happened and how you recovered.
10. **Next action:** exactly what you would do next.

Begin now with section 0. Do not reply with a plan and wait.
