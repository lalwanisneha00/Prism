/*
 * Turns a pasted (or uploaded) syllabus into units and topics, without any AI (V3 · Step 4).
 * University syllabi mostly look like "Unit 1: Title (8 hours) – topic, topic, topic" or a
 * list of lines under each unit heading; both are understood here. Whatever comes out is
 * shown to the student to check and edit before it is saved.
 */

export type DraftChapter = { name: string; topics: string[]; hours?: number };

const UNIT_LINE =
  /^\s*(?:unit|module|chapter|part|section|block)\s*[-–—.:]?\s*([ivxlc]+|\d+)\b[\s.:\-–—)]*(.*)$/i;
const BULLET = /^\s*(?:[-*•·▪◦‣]|\(?\d{1,2}[.)]|\(?[a-z][.)])\s+/i;
const HOURS = /\(?\s*(\d{1,3})\s*(?:hours?|hrs?|lectures?|periods?|L)\s*\)?/i;

export const MAX_CHAPTERS = 30;
export const MAX_TOPICS_PER_CHAPTER = 40;

function cleanTopic(text: string): string {
  return text
    .replace(BULLET, "")
    .replace(HOURS, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s.:;,\-–—]+|[\s.:;,\-–—]+$/g, "")
    .trim()
    .slice(0, 120);
}

/** "topic, topic; topic – topic" → separate topics (keeps "a, b and c" pieces apart too). */
function splitTopics(text: string): string[] {
  return text
    .split(/[,;•·]|\s[–—-]\s|\.\s+(?=[A-Z])/)
    .map(cleanTopic)
    .filter((t) => t.length >= 3 && /[a-z]/i.test(t));
}

export function parseSyllabusText(text: string): DraftChapter[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const chapters: DraftChapter[] = [];
  let current: DraftChapter | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const unit = UNIT_LINE.exec(line);
    if (unit) {
      let rest = unit[2] ?? "";
      const hours = HOURS.exec(rest);
      rest = rest.replace(HOURS, " ");
      // "Unit 2: Ecosystems: structure, food chains" → title "Ecosystems", topics after the colon.
      const [title, ...more] = rest.split(/[:–—]\s+|\s-\s/);
      current = {
        name: cleanTopic(title) || `Unit ${unit[1].toUpperCase()}`,
        topics: splitTopics(more.join(", ")),
        ...(hours ? { hours: Number(hours[1]) } : {}),
      };
      chapters.push(current);
      continue;
    }
    if (!current) {
      current = { name: "Topics", topics: [] };
      chapters.push(current);
    }
    // A bulleted or numbered line is one topic; a plain line may list several.
    const topics = BULLET.test(line) ? [cleanTopic(line)] : splitTopics(line);
    current.topics.push(...topics.filter(Boolean));
  }

  return chapters
    .map((c) => ({ ...c, topics: [...new Set(c.topics)].slice(0, MAX_TOPICS_PER_CHAPTER) }))
    .filter((c) => c.topics.length > 0)
    .slice(0, MAX_CHAPTERS);
}

/** The outline as editable text: one "Unit: name" line, then one topic per line. */
export function draftToText(chapters: readonly DraftChapter[]): string {
  return chapters
    .map((c, i) => [`Unit ${i + 1}: ${c.name}`, ...c.topics.map((t) => `- ${t}`)].join("\n"))
    .join("\n\n");
}
