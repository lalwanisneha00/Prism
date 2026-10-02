import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { sampleLessons } from "@/data/sampleLessons";
import {
  addCards,
  cardId,
  cardsFromLesson,
  deleteCard,
  dueCards,
  listCards,
  reviewCard,
} from "@/lib/flashcards/cards";
import { resetDbForTests } from "@/lib/storage/db";
import { listOutbox } from "@/lib/storage/records";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDbForTests();
});

const lesson = sampleLessons[0];
const topic = { subject: "em", chapter: "electrostatics", topic: "gauss-law" };
const DAY = 86_400_000;

describe("flashcards", () => {
  it("turns a lesson's glossary, quiz and mistakes into cards", () => {
    const cards = cardsFromLesson(lesson);
    expect(cards.length).toBe(
      (lesson.glossary?.length ?? 0) + lesson.quiz.length + lesson.misconceptions.length,
    );
    expect(cards[0].front).toMatch(/^What is \*\*/);
    expect(cards.find((c) => c.origin === "misconception")?.back).toMatch(/^\*\*False\.\*\*/);
  });

  it("saves cards once and syncs them", async () => {
    const drafts = cardsFromLesson(lesson);
    expect(await addCards(topic, drafts, 1000)).toEqual({ added: drafts.length, existing: 0 });
    expect(await addCards(topic, drafts, 2000)).toEqual({ added: 0, existing: drafts.length });
    expect((await listCards()).length).toBe(drafts.length);
    expect((await listOutbox()).every((e) => e.collection === "flashcards")).toBe(true);
    expect(cardId(topic, "Q?")).toBe(cardId(topic, "  q? "));
  });

  it("reviews move a card's due date; deleted cards disappear", async () => {
    await addCards(topic, [{ front: "Q", back: "A", origin: "manual" }], 0);
    let [card] = await listCards();
    expect(dueCards([card], 0)).toHaveLength(1);
    card = await reviewCard(card, "good", 0);
    expect(card.srs.due).toBe(DAY);
    expect(dueCards(await listCards(), DAY / 2)).toHaveLength(0);
    expect(dueCards(await listCards(), DAY)).toHaveLength(1);
    await deleteCard(card, 5);
    expect(await listCards()).toEqual([]);
  });
});
