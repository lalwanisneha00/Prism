import { AnthropicProvider } from "@/lib/llm/anthropic";
import { GeminiProvider } from "@/lib/llm/gemini";
import { OpenAiCompatibleProvider } from "@/lib/llm/openaiCompatible";
import { LlmError, type GenerateOptions, type LlmProvider } from "@/lib/llm/types";
import {
  findProvider,
  KEY_HEADERS,
  looksLikeKey,
  redact,
  validModel,
  type ProviderInfo,
} from "@/lib/byok/catalogue";

/*
 * A student's own API key (Feature A). The key arrives in request headers over HTTPS, builds a
 * provider for that one request and is then forgotten: never stored, never logged. Every error
 * message that leaves here has the key removed.
 */

export type UserKeyRequest = {
  info: ProviderInfo;
  model: string;
  /** The provider to call (wraps the real one so its errors never contain the key). */
  provider: LlmProvider;
};

/** Wraps a provider so any error text is stripped of the key before anyone can log it. */
class KeySafeProvider implements LlmProvider {
  readonly supportsImages: boolean | undefined;
  constructor(
    private readonly inner: LlmProvider,
    private readonly secret: string,
    readonly name: string,
  ) {
    this.supportsImages = inner.supportsImages;
  }
  async generateJson(options: GenerateOptions): Promise<string> {
    try {
      return await this.inner.generateJson(options);
    } catch (err) {
      if (err instanceof LlmError) {
        throw new LlmError(err.kind, redact(err.message, this.secret), err.retryAfterMs);
      }
      throw new LlmError("unavailable", redact(String(err), this.secret));
    }
  }
}

function build(info: ProviderInfo, model: string, key: string): LlmProvider {
  switch (info.kind) {
    case "gemini":
      return new GeminiProvider(key, model);
    case "anthropic":
      return new AnthropicProvider(key, model);
    case "openai":
      return new OpenAiCompatibleProvider(info.name, info.url!, key, model, {
        omitTemperature: info.omitTemperature,
      });
  }
}

/** Null when the request carries no key; throws LlmError("auth") when it carries a broken one. */
export function userKeyFromHeaders(headers: Headers): UserKeyRequest | null {
  const id = headers.get(KEY_HEADERS.provider);
  const key = headers.get(KEY_HEADERS.key);
  if (!id && !key) return null;
  const info = id ? findProvider(id) : undefined;
  if (!info || !key || !looksLikeKey(key)) {
    throw new LlmError("auth", "The API key sent with this request isn't usable.");
  }
  const model = headers.get(KEY_HEADERS.model) || info.defaultModel;
  if (!validModel(model)) throw new LlmError("auth", "The model name sent isn't valid.");
  return {
    info,
    model,
    provider: new KeySafeProvider(build(info, model, key), key, `Your ${info.name} key`),
  };
}

/**
 * The providers for a request: the student's own key alone when they sent one (a failure is
 * reported to them, with an offer to retry on the shared key), otherwise the shared ones.
 */
export function chainFor(req: Request, shared: () => LlmProvider[]): LlmProvider[] {
  let user: UserKeyRequest | null;
  try {
    user = userKeyFromHeaders(req.headers);
  } catch (err) {
    const failing: LlmProvider = {
      name: "Your key",
      generateJson: () => Promise.reject(err),
    };
    return [failing];
  }
  return user ? [user.provider] : shared();
}

/** True when this request came with a key of the student's own. */
export function hasUserKey(req: Request): boolean {
  return req.headers.has(KEY_HEADERS.key);
}
