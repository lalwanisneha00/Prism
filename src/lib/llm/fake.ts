import type { GenerateOptions, LlmProvider } from "@/lib/llm/types";

/** Decides what the fake AI "says" for a given request. */
export type FakeResponder = (options: GenerateOptions, call: number) => string;

/**
 * A stand-in AI for tests and offline development (LLM_PROVIDER=fake).
 * It streams its reply in small pieces, like a real provider.
 */
export class FakeProvider implements LlmProvider {
  readonly name = "Fake";
  readonly supportsImages = true;
  private calls = 0;

  constructor(
    private readonly respond: FakeResponder,
    private readonly chunkDelayMs = 0,
  ) {}

  async generateJson(options: GenerateOptions) {
    const reply = this.respond(options, this.calls++);
    for (let i = 0; i < reply.length; i += 400) {
      if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError");
      options.onText?.(reply.slice(i, i + 400));
      if (this.chunkDelayMs) await new Promise((r) => setTimeout(r, this.chunkDelayMs));
    }
    return reply;
  }
}
