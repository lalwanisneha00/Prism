/** What can go wrong when calling an AI provider, in terms the UI can explain. */
export type LlmErrorKind =
  | "not-configured" // no API key set
  | "auth" // key rejected
  | "rate-limit" // free quota used up for now
  | "unavailable" // provider down, timeout or network error
  | "bad-response"; // reply could not be used even after retries

export class LlmError extends Error {
  constructor(
    public readonly kind: LlmErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "LlmError";
  }
}

export type GenerateOptions = {
  system: string;
  prompt: string;
  temperature?: number;
  /** Called with each new piece of text as it streams in. */
  onText?: (chunk: string) => void;
  signal?: AbortSignal;
};

/** Every AI provider looks the same to the rest of the app, so they can be swapped. */
export interface LlmProvider {
  readonly name: string;
  /** Returns the full reply text, which the caller expects to be JSON. */
  generateJson(options: GenerateOptions): Promise<string>;
}
