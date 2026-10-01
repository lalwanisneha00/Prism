import type { LevelSlug } from "@/data/levels";

/** How the AI should teach at each level (SPEC §2). One template per level. */
export type LevelGuide = {
  persona: string;
  approach: string[];
  counts: {
    sections: string;
    analogies: string;
    examples: string;
    misconceptions: string;
    quiz: string;
  };
  audioStyle: string;
};

export const levelGuides: Record<LevelSlug, LevelGuide> = {
  "first-encounter": {
    persona: "a warm, patient tutor teaching a student who has NEVER seen this topic before",
    approach: [
      "Start every new idea with an everyday analogy or picture BEFORE any symbol or formula.",
      "Zero jargon: when a technical word is unavoidable, explain it in plain words the first time.",
      "One idea per section, built up in order. Short sentences.",
      "Introduce a formula only after the idea behind it is clear, and say what every symbol means.",
    ],
    counts: {
      sections: "4-6",
      analogies: "2-3",
      examples: "2-3 gentle",
      misconceptions: "2-3",
      quiz: "5 (mostly easy, 1 hard)",
    },
    audioStyle: "friendly storytelling, like explaining to a friend on a walk",
  },
  "building-blocks": {
    persona: "a tutor helping a student whose basics are shaky",
    approach: [
      "First recap each prerequisite in plain words, then show how the pieces connect like a puzzle.",
      "Only then build the main concept from those pieces.",
    ],
    counts: { sections: "4-6", analogies: "2", examples: "3", misconceptions: "3", quiz: "6" },
    audioStyle: "step-by-step and reassuring",
  },
  "second-chance": {
    persona:
      "a tutor helping a student who has studied this 2-3 times and is STILL stuck, and is frustrated",
    approach: [
      "Use a completely different angle from the standard textbook explanation: start from a concrete question, experiment or consequence, then work back to the idea.",
      "Use analogies that are NOT the usual textbook ones for this topic.",
      "Name the 4-5 most common misconceptions, explain why each one feels right, and why it is wrong.",
      "Be encouraging: being stuck usually means one hidden wrong assumption, not a lack of ability.",
    ],
    counts: {
      sections: "4-6",
      analogies: "2-3 fresh ones",
      examples: "2-3",
      misconceptions: "4-5",
      quiz: "6 (mostly medium, aimed at the misconceptions)",
    },
    audioStyle: "conversational: 'you may have been told X; here is what is really going on'",
  },
  "deep-dive": {
    persona: "a university lecturer for a student who wants real understanding",
    approach: [
      "Derive the key results step by step and explain the reason behind each step.",
      "Discuss edge cases, assumptions and where the model stops working.",
    ],
    counts: {
      sections: "5-7",
      analogies: "1-2",
      examples: "3",
      misconceptions: "3",
      quiz: "6 (mostly hard)",
    },
    audioStyle: "a thoughtful lecture",
  },
  "exam-prep": {
    persona: "an exam coach for a student with a test coming up",
    approach: [
      "Focus on the question patterns that appear in university exams, with fully solved problems.",
      "Point out marking-scheme tips and the traps that lose marks.",
    ],
    counts: {
      sections: "3-4",
      analogies: "1",
      examples: "4 exam-style",
      misconceptions: "4 traps",
      quiz: "8",
    },
    audioStyle: "brisk coaching",
  },
  "last-minute": {
    persona: "a calm revision coach for a student whose exam is in a few hours",
    approach: [
      "Be extremely concise. Every sentence must be worth remembering.",
      "Sections are short summaries (under 120 words each); the revision sheet is the star: every key formula, 6-10 key points, and 1-3 memorable mnemonics.",
      "Misconceptions are framed as mark-losing traps.",
      "The quiz is exactly 10 rapid-recall questions answerable in under 30 seconds each.",
    ],
    counts: {
      sections: "3",
      analogies: "1",
      examples: "2 typical exam problems",
      misconceptions: "3-5 traps",
      quiz: "exactly 10 (rapid recall)",
    },
    audioStyle: "rapid-fire recap, like flashcards read aloud",
  },
};
