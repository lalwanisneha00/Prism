"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/account/AuthProvider";
import { deviceProfile, postFlag } from "@/components/flags/flagApi";
import { Icon } from "@/components/Icon";
import { SYLLABUS_FIX_CONFIG } from "@/lib/syllabusFix/config";

/*
 * "2 students say Introduction to AI is taught in semester 3. Agree?" (syllabus fix, Phase 5).
 * A bar at the bottom of the screen on every page, for a signed-in student whose profile has a
 * branch and semester (the suggestion is for that branch and semester), at most once per visit.
 * One tap answers; × closes it without answering. Nothing shows when there is nothing to ask.
 */

const SHOWN_KEY = "prism.syllabusPromptsShown";

function shownThisVisit(): number {
  try {
    return Number(sessionStorage.getItem(SHOWN_KEY) ?? "0") || 0;
  } catch {
    return 0;
  }
}

function markShown() {
  try {
    sessionStorage.setItem(SHOWN_KEY, String(shownThisVisit() + 1));
  } catch {
    // Storage blocked: the prompt may come back on the next page, which is harmless.
  }
}

type Prompt = { proposalId: string; text: string; supporters: number };
type Answer = "agree" | "disagree" | "unsure";

/** "The chapter ..." reads as "2 students say the chapter ...". */
const sentence = (n: number, text: string) =>
  `${n} student${n === 1 ? "" : "s"} from your branch and semester say ${/^(The|A) /.test(text) ? text[0].toLowerCase() + text.slice(1) : text}. Agree?`;

export function ConfirmPrompt() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (!user || shownThisVisit() >= SYLLABUS_FIX_CONFIG.promptsPerSession) return;
    let alive = true;
    void (async () => {
      const profile = await deviceProfile();
      // Suggestions belong to a branch and semester: without the student's own, nothing to ask.
      if (!profile.branch || !profile.semester) return;
      const token = await user.getIdToken().catch(() => undefined);
      if (!token) return;
      const r = await postFlag("/api/syllabus/prompt", { profile }, token);
      const next = r.ok ? (r.prompt ?? null) : null;
      if (!alive || !next) return;
      markShown();
      setPrompt(next);
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  // The thank-you note goes away by itself.
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setClosed(true), 6000);
    return () => clearTimeout(t);
  }, [done]);

  if (!prompt || closed) return null;

  async function answer(kind: Answer) {
    if (!user || !prompt) return;
    setError(null);
    setSending(true);
    try {
      const token = await user.getIdToken().catch(() => undefined);
      const r = await postFlag(
        "/api/syllabus/vote",
        { proposalId: prompt.proposalId, kind, profile: await deviceProfile() },
        token,
      );
      if (!r.ok) return setError(r.message);
      setDone(
        r.live
          ? "Thanks! Enough students agreed, so this fix is now live for everyone."
          : kind === "unsure"
            ? "No problem. We won't ask you about this one again."
            : "Thanks! Your answer is counted.",
      );
    } finally {
      setSending(false);
    }
  }

  const btn =
    "rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-2 disabled:opacity-50";
  return (
    <section
      aria-label="Help check the syllabus"
      data-testid="syllabus-prompt"
      className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-2xl flex-col gap-3 rounded-2xl border border-primary/30 bg-surface p-4 shadow-xl sm:bottom-6"
    >
      <div className="flex items-start justify-between gap-3">
        {done ? (
          <p role="status" className="text-sm">
            {done}
          </p>
        ) : (
          <p className="text-sm">
            <Icon name="flag" /> {sentence(prompt.supporters, prompt.text)}
          </p>
        )}
        <button
          type="button"
          onClick={() => setClosed(true)}
          aria-label="Close"
          className="rounded-full px-2 text-lg leading-none text-muted hover:bg-surface-2"
        >
          ×
        </button>
      </div>
      {!done && (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={sending}
              onClick={() => void answer("agree")}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-50"
            >
              Agree
            </button>
            <button
              type="button"
              disabled={sending}
              onClick={() => void answer("disagree")}
              className={btn}
            >
              Disagree
            </button>
            <button
              type="button"
              disabled={sending}
              onClick={() => void answer("unsure")}
              className={btn}
            >
              Not sure
            </button>
          </div>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </>
      )}
    </section>
  );
}
