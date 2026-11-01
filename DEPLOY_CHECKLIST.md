# Deploy checklist

Written for Sneha. Last updated 2026-11-01. Prism runs on Vercel's free plan and Firebase's free Spark plan; nothing here costs money.

## 1. How a deploy happens

Every `git push` to `main` makes Vercel build and publish production automatically. To undo a bad deploy: Vercel → the Prism project → **Deployments** → open the previous good one → **Promote to Production**.

Vercel settings that must stay as they are:

- **Node.js 24** (set by `"engines"` in `package.json`; Firebase admin needs it).
- **Fluid Compute on** (Project → Settings → Functions). Lab lessons (`/api/practical`) may run up to 300 s, which the free plan allows only with Fluid Compute. All other AI routes stop at 60 s.

## 2. Environment variables on Vercel (names only; Project → Settings → Environment Variables)

**No AI keys on Vercel, on purpose.** Every student adds their own key in the app (Settings → Your API keys), and it is used only for their own requests. Don't add `GEMINI_API_KEY` or `GROQ_API_KEY` to Vercel. They belong only in `.env.local` on your computer, for local testing.

**Never set** `LLM_PROVIDER` on Vercel (it switches on the fake AI used by tests).

Needed:

| Variable                                                                                                                                                                                                                | What it is for                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID` | Sign-in and sync (Firebase web config)                                            |
| `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`                                                                                                                                | The server's database access: shared lesson library, flags, votes, the admin page |
| `ADMIN_UID`                                                                                                                                                                                                             | Your Firebase user id: the only account that can open `/admin/syllabus`           |

Check: open `https://<your site>/api/status`. It says (yes/no) whether database access is set up, without showing any secret.

Optional:

| Variable                             | Default | What it does                                                                   |
| ------------------------------------ | ------- | ------------------------------------------------------------------------------ |
| `YOUTUBE_API_KEY`                    | not set | Demonstration videos on lab lessons (free key from Google Cloud, no billing)   |
| `NEXT_PUBLIC_FLAG_BYO_KEY`           | on (1)  | "Your API keys" page (keep on: the live site has no shared key)                |
| `NEXT_PUBLIC_FLAG_SLIDES_PDF`        | on (1)  | "Make slides or a PDF instead" and "My slides and PDFs"                        |
| `NEXT_PUBLIC_FLAG_REDESIGN`          | on (1)  | The new look (off = everyone sees the Classic look)                            |
| `NEXT_PUBLIC_FLAG_PDEU_SYLLABUS`     | on (1)  | PDEU's Core / Non-core sections on the subjects page                           |
| `NEXT_PUBLIC_FLAG_PRACTICAL_COURSES` | off (0) | Lab courses inside the theory subject lists (labs have their own pages anyway) |
| `NEXT_PUBLIC_FLAG_COMMUNITY`         | off (0) | Community branches: **not built**, leave off                                   |

Changing a variable needs a redeploy (Deployments → ⋯ → Redeploy).

## 3. Firebase

- **Rules:** `firestore.rules` in the repo. When it changes, paste it into Firebase console → Firestore → Rules → Publish. The syllabus-fix collections need no rule paste: browsers are denied by the catch-all rule and only Prism's server writes them.
- **Authorised domains:** Firebase console → Authentication → Settings → **Authorized domains** must list your production domain, or Google sign-in fails there.
- Free plan only: no Cloud Functions, no Firebase Storage. Limits: 50,000 reads and 20,000 writes per day.
- Backup (uses reads from the daily allowance): `npm run backup:firestore` writes to `backups/` (not committed).

## 4. Five-minute smoke test on the live site

1. Home page loads, no console errors. Toggle dark mode and back.
2. Settings → **Your API keys**: paste a free Gemini key (https://aistudio.google.com/apikey), press **Test key**, save.
3. Pick a branch and semester, a subject, chapter and topic, then **Build my lesson**: the lesson streams in and the quiz works.
4. Open a lab course and one experiment: the lab lesson loads in its format (circuit, programming, …).
5. Flag a topic from the topic list (needs sign-in): the dialog opens and says thank you.
6. Sign in with Google: the Dashboard still shows earlier progress. As the admin, `/admin/syllabus` opens.
7. Phone width (375px): repeat steps 1 and 3.

If something is wrong: switch the related flag off and redeploy, or promote the previous deployment.
