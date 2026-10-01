import type { LessonEvent } from "@/lib/lessonEvents";

/** Reads newline-delimited JSON events from the /api/lesson response body. */
export async function readLessonStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: LessonEvent) => void,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) if (line.trim()) onEvent(JSON.parse(line) as LessonEvent);
  }
  buffer += decoder.decode();
  if (buffer.trim()) onEvent(JSON.parse(buffer) as LessonEvent);
}
