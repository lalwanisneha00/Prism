/**
 * Shown only when the server runs with LLM_PROVIDER=fake (the canned test AI). Every lesson
 * is then the same sample Gauss's-law lesson, so the page says so plainly.
 */
export function TestModeBanner() {
  if (process.env.LLM_PROVIDER !== "fake") return null;
  return (
    <p role="status" className="bg-warning px-4 py-2 text-center text-sm font-semibold text-black">
      Test mode: this server uses a fake AI, so every lesson is the same sample Gauss&apos;s-law
      lesson. Run <code>npm run dev</code> on http://localhost:3000 for real lessons.
    </p>
  );
}
