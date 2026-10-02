import { newSrs, review, type Grade } from "@/lib/flashcards/srs";
import type { Lesson } from "@/lib/schema";
import type { Flashcard } from "@/lib/storage/db";
import { getAllRecords, getRecord, putRecord } from "@/lib/storage/records";

/*
 * Flashcards (SPEC §8): made from a lesson for free (no AI), from a text selection, or by
 * hand, then reviewed with spaced repetition. Every change syncs like the other records.
 */

export type CardDraft = Pick<Flashcard, "front" | "back" | "origin">;
export type CardTopic = Pick<Flashcard, "subject" | "chapter" | "topic">;

/** A short, stable id from text, so making cards twice from one lesson doesn't duplicate them. */
export function cardId(topic: CardTopic, front: string): string {
  let h = 2166136261;
  const key = `${topic.subject}|${topic.topic}|${front.trim().toLowerCase()}`;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${topic.subject}:${topic.topic}:${(h >>> 0).toString(36)}`;
}

/** The lesson's glossary, quiz and common mistakes as question → answer cards. */
export function cardsFromLesson(lesson: Lesson): CardDraft[] {
  const glossary: CardDraft[] = (lesson.glossary ?? []).map((g) => ({
    front: `What is **${g.term}**?`,
    back: g.definition,
    origin: "glossary",
  }));
  const quiz: CardDraft[] = lesson.quiz.map((q) => ({
    front: q.question,
    back: `**${q.answer}**\n\n${q.explanation}`,
    origin: "quiz",
  }));
  const mistakes: CardDraft[] = lesson.misconceptions.map((m) => ({
    front: `True or false? ${m.wrong}`,
    back: `**False.** ${m.right}\n\n${m.why}`,
    origin: "misconception",
  }));
  return [...glossary, ...quiz, ...mistakes];
}

/** Saves new cards; ones that already exist (same topic and front) are left as they are. */
export async function addCards(
  topic: CardTopic,
  drafts: CardDraft[],
  now = Date.now(),
): Promise<{ added: number; existing: number }> {
  let added = 0;
  let existing = 0;
  for (const draft of drafts) {
    const id = cardId(topic, draft.front);
    const current = await getRecord("flashcards", id);
    if (current && !current.deleted) {
      existing++;
      continue;
    }
    await putRecord("flashcards", {
      id,
      ...topic,
      ...draft,
      createdAt: now,
      srs: newSrs(now),
      updatedAt: now,
      deleted: false,
    });
    added++;
  }
  return { added, existing };
}

export async function listCards(): Promise<Flashcard[]> {
  return (await getAllRecords("flashcards")).filter((c) => !c.deleted);
}

/** Cards due now, most overdue first. */
export function dueCards(cards: Flashcard[], now: number): Flashcard[] {
  return cards.filter((c) => c.srs.due <= now).sort((a, b) => a.srs.due - b.srs.due);
}

export async function reviewCard(
  card: Flashcard,
  grade: Grade,
  now = Date.now(),
): Promise<Flashcard> {
  const next: Flashcard = { ...card, srs: review(card.srs, grade, now), updatedAt: now };
  await putRecord("flashcards", next);
  return next;
}

export async function updateCard(
  card: Flashcard,
  change: Pick<Flashcard, "front" | "back">,
  now = Date.now(),
): Promise<void> {
  await putRecord("flashcards", { ...card, ...change, updatedAt: now });
}

export async function deleteCard(card: Flashcard, now = Date.now()): Promise<void> {
  await putRecord("flashcards", { ...card, deleted: true, updatedAt: now });
}
