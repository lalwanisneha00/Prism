"use client";

import { Icon } from "@/components/Icon";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDataVersion } from "@/components/account/AuthProvider";
import { AddCardForm } from "@/components/flashcards/AddCardForm";
import { CardList } from "@/components/flashcards/CardList";
import { Markdown } from "@/components/lesson/Markdown";
import { dueCards, listCards, reviewCard } from "@/lib/flashcards/cards";
import { describeNext, type Grade } from "@/lib/flashcards/srs";
import type { Flashcard } from "@/lib/storage/db";
import { findSubject, subjects } from "@/lib/subjects";

const grades: { grade: Grade; label: string; key: string; style: string }[] = [
  { grade: "again", label: "Again", key: "1", style: "border-danger/40 text-danger" },
  { grade: "hard", label: "Hard", key: "2", style: "border-warning/40 text-warning" },
  { grade: "good", label: "Good", key: "3", style: "border-success/40 text-success" },
  { grade: "easy", label: "Easy", key: "4", style: "border-primary/40 text-primary" },
];

type State = { status: "loading" } | { status: "error" } | { status: "ready"; cards: Flashcard[] };

/** Review due flashcards one at a time: think, flip, rate (Space to flip, 1–4 to rate). */
export function FlashcardReview() {
  const dataVersion = useDataVersion();
  const [state, setState] = useState<State>({ status: "loading" });
  const [subject, setSubject] = useState("all");
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(() => {
    listCards()
      .then((cards) => setState({ status: "ready", cards }))
      .catch(() => setState({ status: "error" }));
  }, []);
  useEffect(load, [load, dataVersion]);

  const cards = useMemo(() => (state.status === "ready" ? state.cards : []), [state]);
  const inSubject = useMemo(
    () => cards.filter((c) => subject === "all" || c.subject === subject),
    [cards, subject],
  );
  const queue = dueCards(inSubject, now);
  const card = queue[0];

  const rate = useCallback(
    async (grade: Grade) => {
      if (!card) return;
      const next = await reviewCard(card, grade);
      setState((s) =>
        s.status === "ready"
          ? { ...s, cards: s.cards.map((c) => (c.id === next.id ? next : c)) }
          : s,
      );
      setFlipped(false);
      setReviewed((n) => n + 1);
      setNow(Date.now());
    },
    [card],
  );

  // Keyboard: Space or Enter flips; 1–4 rates.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest("input, textarea, select, button")) return;
      if (!card) return;
      if (!flipped && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setFlipped(true);
      } else if (flipped) {
        const g = grades.find((x) => x.key === e.key);
        if (g) void rate(g.grade);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card, flipped, rate]);

  if (state.status === "loading") {
    return <div className="h-64 animate-pulse rounded-2xl bg-surface-2" aria-busy="true" />;
  }
  if (state.status === "error") {
    return (
      <p role="alert" className="rounded-2xl border border-border bg-surface p-5">
        This browser is blocking storage (for example in private browsing), so flashcards can&apos;t
        be kept here.
      </p>
    );
  }

  const nextDue = inSubject.filter((c) => c.srs.due > now).sort((a, b) => a.srs.due - b.srs.due)[0];
  const usedSubjects = subjects.filter((s) => cards.some((c) => c.subject === s.id));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <dl className="flex flex-wrap gap-2 text-sm">
          <Stat label="Due now" value={queue.length} />
          <Stat label="Reviewed today" value={reviewed} />
          <Stat label="Total cards" value={inSubject.length} />
        </dl>
        {usedSubjects.length > 1 && (
          <label className="ml-auto flex items-center gap-2 text-sm">
            <span>Subject</span>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="rounded-lg border border-border bg-surface px-2 py-1"
            >
              <option value="all">All</option>
              {usedSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {cards.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border bg-surface-2 p-6">
          <p className="font-semibold">No flashcards yet</p>
          <p className="text-muted">
            Open any lesson and press{" "}
            <span className="font-semibold">
              <Icon name="library" /> Flashcards
            </span>
            , or select text in a lesson and choose{" "}
            <span className="font-semibold">＋ Flashcard</span>. You can also add your own below.
          </p>
          <Link
            href="/#start"
            className="rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-fg hover:bg-primary-hover"
          >
            Start a lesson
          </Link>
        </div>
      ) : card ? (
        <section aria-label="Flashcard review" className="flex flex-col gap-4">
          <div className="flex min-h-56 flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-8">
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">
              {findSubject(card.subject)?.name ?? card.subject} · {card.topic.replace(/-/g, " ")}
            </p>
            <Markdown className="text-lg">{card.front}</Markdown>
            {flipped && (
              <div className="border-t border-border pt-4" aria-live="polite">
                <Markdown>{card.back}</Markdown>
              </div>
            )}
          </div>
          {flipped ? (
            <div className="grid grid-cols-4 gap-2">
              {grades.map((g) => (
                <button
                  key={g.grade}
                  type="button"
                  onClick={() => void rate(g.grade)}
                  className={`flex flex-col items-center rounded-xl border-2 bg-surface px-2 py-2 font-semibold hover:bg-surface-2 ${g.style}`}
                >
                  <span>{g.label}</span>
                  <span className="text-xs font-normal text-muted">
                    {describeNext(card.srs, g.grade, now)}
                  </span>
                  <kbd className="hidden text-[10px] text-muted sm:block">{g.key}</kbd>
                </button>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setFlipped(true)}
              className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-fg hover:bg-primary-hover"
            >
              Show answer <span className="hidden text-sm opacity-80 sm:inline">(Space)</span>
            </button>
          )}
          <p className="text-center text-sm text-muted">
            Try to answer in your head first, then rate honestly: the schedule adapts to you.
          </p>
        </section>
      ) : (
        <div className="rounded-2xl border border-border bg-surface p-6 text-center">
          <p className="text-lg font-semibold">
            <Icon name="done" /> All caught up!
          </p>
          <p className="mt-1 text-muted">
            {nextDue
              ? `Your next card is due ${new Date(nextDue.srs.due).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" })}.`
              : "No cards in this subject yet."}
          </p>
        </div>
      )}

      <AddCardForm onAdded={load} />
      {inSubject.length > 0 && <CardList cards={inSubject} now={now} onChange={load} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-1.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-lg font-bold">{value}</dd>
    </div>
  );
}
