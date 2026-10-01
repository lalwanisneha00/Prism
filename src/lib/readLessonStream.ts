import type { LessonEvent } from "@/lib/lessonEvents";

/** Reads a newline-delimited JSON (NDJSON) response body, one event per line. */
export async function readNdjson<T>(body: ReadableStream<Uint8Array>, onEvent: (event: T) => void) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) if (line.trim()) onEvent(JSON.parse(line) as T);
  }
  buffer += decoder.decode();
  if (buffer.trim()) onEvent(JSON.parse(buffer) as T);
}

/** Reads the /api/lesson stream. */
export function readLessonStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: LessonEvent) => void,
) {
  return readNdjson<LessonEvent>(body, onEvent);
}
