# Deploy checklist: `overnight-v3-final`

Written for Sneha. Everything here is something you do in a browser or one command; nothing was changed on the live site or in the live Firebase project overnight.

## 1. Review the preview first

1. Open the Vercel dashboard → the Prism project → **Deployments**. The newest deployment of branch `overnight-v3-final` is the preview. (If it is missing: Project → Settings → Git → check the branch is not ignored.)
2. Open the preview URL on your phone and on your computer. Run the five-minute smoke test in section 6.
3. In the preview, look at the footer: **Classic look** switches back to the earlier purple interface if you prefer it.

## 2. Merge

Only when the preview looks right:

```bash
git checkout main
git pull
git merge --no-ff overnight-v3-final
git push
```

Vercel then builds production from `main`. To undo: in Vercel → Deployments, open the previous production deployment → **Promote to Production**.

## 3. Environment variables Vercel needs (names only, set under Project → Settings → Environment Variables)

Already used before tonight (keep as they are):

- `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`, `GEMINI_FALLBACK_MODELS`)
- `GROQ_API_KEY` (optional, `GROQ_MODEL`)
- `MISTRAL_API_KEY`, `OPENROUTER_API_KEY` (optional fallbacks)
- `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`
- `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`

**Never set** `LLM_PROVIDER` on the live site (it switches on the fake AI used for tests).

New tonight (all optional; leave unset to use the default shown):

| Variable                      | Default | What it does                                          |
| ----------------------------- | ------- | ----------------------------------------------------- |
| `NEXT_PUBLIC_FLAG_BYO_KEY`    | on (1)  | "Your API keys" page and use of your own key          |
| `NEXT_PUBLIC_FLAG_SLIDES_PDF` | on (1)  | "Make slides or a PDF instead" and "My slides and PDFs" |
| `NEXT_PUBLIC_FLAG_REDESIGN`   | on (1)  | The new look (off = everyone sees the Classic look)   |
| `NEXT_PUBLIC_FLAG_COMMUNITY`  | off (0) | Community branches: **not built**, leave off          |

Changing a flag needs a redeploy (Deployments → ⋯ → Redeploy).

## 4. Firebase

- **Rules: nothing to apply.** Tonight's features (own API keys, slides and PDFs, the planner, the redesign) keep their data on the device only, so `firestore.rules` is unchanged. Feature D (community branches) was not started, so there is no `firestore.rules.proposed`.
- **Authorised domains:** Firebase console → Authentication → Settings → **Authorized domains** → add your production domain and the Vercel preview domain (for example `prism-git-overnight-v3-final-<team>.vercel.app`) so sign-in works there.
- Free plan only: no Cloud Functions, no Storage. Generated slide decks and PDFs are kept in the browser (IndexedDB), not in the cloud.

## 5. Flags: my recommendation at launch

| Feature                | Recommendation | Why                                                                                                                      |
| ---------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Your API keys          | **On**         | Tested end to end with mocked providers. Takes pressure off the shared key. Live providers were not called overnight.     |
| Slides and PDFs        | **On**         | Both formats tested in four themes and checked by opening the decks in PowerPoint. Heavy libraries load only when used.  |
| Redesign               | **On**         | Classic stays one click away in the footer. Switch off the flag only if you see a layout problem you don't want to ship. |
| Community branches     | **Off**        | Not built.                                                                                                               |

## 6. Five-minute smoke test on the live site

1. Home page loads, no console errors, hero and six level colours show. Toggle dark mode and back.
2. Pick **Electricity & Magnetism → Electrostatics → Gauss's law**, level Building Blocks. A length is marked **Recommended**; press **Build my lesson**; the lesson streams in and the quiz works.
3. Open **Make slides or a PDF instead**, choose *For teaching*, PowerPoint, 10 slides, a theme. A file downloads; open it in PowerPoint and check the speaker notes pane. Repeat with PDF.
4. Footer → **Your API keys**: paste a free Gemini key, press **Test key** (it should say it works), save, make one lesson and check "Using: your Google Gemini key" shows; then **Remove key**.
5. **Planner**: add Engineering Mathematics, set 7 days, save. Open **Dashboard** and tick one item.
6. Phone width (375px): repeat steps 1 and 2.
7. Sign in with Google and check the Dashboard still shows your earlier progress.

If anything is wrong: set the relevant flag to `0` and redeploy, or promote the previous deployment.
