import { describe, expect, it } from "vitest";
import { readSseData } from "@/lib/llm/sse";

function streamOf(...parts: string[]) {
  const enc = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(c) {
      for (const p of parts) c.enqueue(enc.encode(p));
      c.close();
    },
  });
}

describe("readSseData", () => {
  it("yields data lines even when split across chunks", async () => {
    const out: string[] = [];
    for await (const d of readSseData(streamOf('data: {"a":', "1}\n\ndata: [DONE]\n"))) out.push(d);
    expect(out).toEqual(['{"a":1}', "[DONE]"]);
  });

  it("handles multi-byte characters split between chunks", async () => {
    const bytes = new TextEncoder().encode("data: ε₀\n");
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(bytes.slice(0, 7));
        c.enqueue(bytes.slice(7));
        c.close();
      },
    });
    const out: string[] = [];
    for await (const d of readSseData(stream)) out.push(d);
    expect(out).toEqual(["ε₀"]);
  });
});
