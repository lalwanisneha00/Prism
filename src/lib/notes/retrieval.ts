/*
 * Search inside the student's own notes, entirely in the browser (SPEC: V2 · Step 3 of the
 * original plan). Pages are split into overlapping passages, and BM25, the classic ranking
 * formula behind most search boxes, scores each passage against the lesson topic.
 */

export type NoteChunk = {
  id: string;
  noteId: string;
  noteName: string;
  page: number;
  text: string;
};

const STOPWORDS = new Set(
  "a an and are as at be by for from has have in is it its of on or that the this to was were will with which we you your can not but if then so than into these those there their they our also may such".split(
    " ",
  ),
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]s\b/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** Splits one page of text into passages of about `size` words that overlap a little. */
export function chunkPage(
  text: string,
  meta: { noteId: string; noteName: string; page: number },
  size = 150,
  overlap = 30,
): NoteChunk[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const chunks: NoteChunk[] = [];
  for (let start = 0, n = 0; start < words.length; start += size - overlap, n++) {
    const piece = words.slice(start, start + size).join(" ");
    if (piece.split(" ").length >= 12 || start === 0) {
      chunks.push({ ...meta, id: `${meta.noteId}:${meta.page}:${n}`, text: piece });
    }
    if (start + size >= words.length) break;
  }
  return chunks.filter((c) => c.text.length > 0);
}

/** BM25 ranking (k1 = 1.5, b = 0.75). Returns the best passages for the query, best first. */
export function searchChunks(chunks: NoteChunk[], query: string, limit = 6): NoteChunk[] {
  const terms = [...new Set(tokenize(query))];
  if (terms.length === 0 || chunks.length === 0) return [];
  const docs = chunks.map((c) => tokenize(c.text));
  const avgLength = docs.reduce((s, d) => s + d.length, 0) / docs.length || 1;
  const k1 = 1.5;
  const b = 0.75;

  const idf = new Map<string, number>();
  for (const t of terms) {
    const df = docs.filter((d) => d.includes(t)).length;
    idf.set(t, Math.log(1 + (docs.length - df + 0.5) / (df + 0.5)));
  }

  return docs
    .map((doc, i) => {
      let score = 0;
      for (const t of terms) {
        const tf = doc.filter((w) => w === t).length;
        if (tf === 0) continue;
        score +=
          idf.get(t)! * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * doc.length) / avgLength)));
      }
      return { chunk: chunks[i], score };
    })
    .filter((r) => r.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
    .map((r) => r.chunk);
}

/** A short summary for syncing: the first sentences of the document (never the full text). */
export function summarize(text: string, maxChars = 280): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxChars) return clean;
  const cut = clean.slice(0, maxChars);
  const end = cut.lastIndexOf(". ");
  return `${cut.slice(0, end > maxChars * 0.5 ? end + 1 : maxChars).trim()} …`;
}
