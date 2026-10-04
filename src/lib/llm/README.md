# lib/llm

The AI adapter (Step 6). The rest of the app calls one `generate()` function; this folder decides whether that means Gemini, Groq, Mistral or OpenRouter (all free tiers, tried in that order). **Server-only**: API keys never leave this folder.
