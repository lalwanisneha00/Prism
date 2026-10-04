/*
 * "Bring your own API key" (Feature A): the providers a student can use, with where to get a
 * key and which models to offer. Plain data shared by the settings page (browser) and the
 * server route that builds the provider, so there is one list to keep right.
 */

export type ProviderId = "gemini" | "groq" | "openai" | "anthropic" | "xai" | "openrouter";

export type ProviderInfo = {
  id: ProviderId;
  name: string;
  /** Which adapter speaks to it: Gemini's own API, Anthropic's, or an OpenAI-style one. */
  kind: "gemini" | "anthropic" | "openai";
  /** Chat-completions URL for the OpenAI-style providers. */
  url?: string;
  /** True when the provider has a free tier you can use without paying. */
  free: boolean;
  freeNote: string;
  keyUrl: string;
  models: { id: string; label: string }[];
  defaultModel: string;
  /** Some newer OpenAI models reject a custom temperature, so it is left out. */
  omitTemperature?: boolean;
};

export const PROVIDERS: readonly ProviderInfo[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    kind: "gemini",
    free: true,
    freeNote: "Free tier (limited requests per day)",
    keyUrl: "https://aistudio.google.com/apikey",
    defaultModel: "gemini-flash-latest",
    models: [
      { id: "gemini-flash-latest", label: "Gemini Flash (balanced)" },
      { id: "gemini-flash-lite-latest", label: "Gemini Flash-Lite (fastest)" },
      { id: "gemini-pro-latest", label: "Gemini Pro (most careful)" },
    ],
  },
  {
    id: "groq",
    name: "Groq",
    kind: "openai",
    url: "https://api.groq.com/openai/v1/chat/completions",
    free: true,
    freeNote: "Free tier (small token limits per minute)",
    keyUrl: "https://console.groq.com/keys",
    defaultModel: "openai/gpt-oss-120b",
    models: [
      { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B" },
      { id: "openai/gpt-oss-20b", label: "GPT-OSS 20B (faster)" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    kind: "openai",
    url: "https://api.openai.com/v1/chat/completions",
    free: false,
    freeNote: "Paid: billed to you by OpenAI",
    keyUrl: "https://platform.openai.com/api-keys",
    defaultModel: "gpt-4.1-mini",
    omitTemperature: true,
    models: [
      { id: "gpt-4.1-mini", label: "GPT-4.1 mini (low cost)" },
      { id: "gpt-4.1", label: "GPT-4.1 (most careful)" },
      { id: "gpt-4o-mini", label: "GPT-4o mini" },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic (Claude)",
    kind: "anthropic",
    free: false,
    freeNote: "Paid: billed to you by Anthropic",
    keyUrl: "https://console.anthropic.com/settings/keys",
    defaultModel: "claude-haiku-4-5-20251001",
    models: [
      { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (low cost)" },
      { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5 (balanced)" },
      { id: "claude-opus-5-5", label: "Claude Opus 5.5 (most careful)" },
    ],
  },
  {
    id: "xai",
    name: "xAI (Grok)",
    kind: "openai",
    url: "https://api.x.ai/v1/chat/completions",
    free: false,
    freeNote: "Paid: billed to you by xAI (new accounts sometimes get free credit)",
    keyUrl: "https://console.x.ai",
    defaultModel: "grok-3-mini",
    models: [
      { id: "grok-3-mini", label: "Grok 3 mini (low cost)" },
      { id: "grok-4", label: "Grok 4 (most careful)" },
    ],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    kind: "openai",
    url: "https://openrouter.ai/api/v1/chat/completions",
    free: true,
    freeNote: "Has free models (names ending in :free); others are paid",
    keyUrl: "https://openrouter.ai/keys",
    defaultModel: "google/gemma-4-31b-it:free",
    models: [{ id: "google/gemma-4-31b-it:free", label: "Gemma 4 31B (free)" }],
  },
];

export function findProvider(id: string): ProviderInfo | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

/** Request headers that carry a student's key to our server, for that one request. */
export const KEY_HEADERS = {
  provider: "x-prism-provider",
  model: "x-prism-model",
  key: "x-prism-key",
} as const;

/** Model names are letters, digits and . _ : / - only: they go into a URL and a request body. */
export function validModel(model: string): boolean {
  return /^[A-Za-z0-9._:/-]{1,100}$/.test(model);
}

/** A key is one run of visible characters, a sensible length. Real checking is "Test key". */
export function looksLikeKey(key: string): boolean {
  return /^[\x21-\x7e]{8,400}$/.test(key);
}

/** Replaces every occurrence of a secret in text, so it never reaches a log or an error. */
export function redact(text: string, ...secrets: (string | undefined)[]): string {
  let out = text;
  for (const secret of secrets) {
    if (secret && secret.length >= 6) out = out.split(secret).join("[key removed]");
  }
  // Provider messages often quote a key in part ("sk-abc…xyz"): hide anything key-shaped too.
  return out.replace(/\b(sk|gsk|xai|AIza)[-_A-Za-z0-9]{12,}/g, "[key removed]");
}
