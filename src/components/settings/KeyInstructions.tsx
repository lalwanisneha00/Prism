/** Plain, step-by-step help for getting and adding an API key. Shown at the top of the keys page. */
export function KeyInstructions() {
  return (
    <div className="flex flex-col gap-5" data-testid="key-instructions">
      <div
        role="note"
        className="rounded-2xl border-2 border-primary bg-primary-soft p-5 text-base"
      >
        <p className="font-bold">Prism will not work without your own API key.</p>
        <p className="mt-1">
          Prism is free, but the AI that writes your lessons needs a key. You make one for free in
          about 2 minutes, and it is only for you. Without a key, lessons cannot be made.
        </p>
      </div>

      <section
        aria-labelledby="steps-title"
        className="rounded-2xl border border-border bg-surface p-5"
      >
        <h2 id="steps-title" className="text-xl font-bold">
          How to add your key (free, 2 minutes)
        </h2>
        <p className="mt-1 text-sm text-muted">
          We use Google Gemini because it has a free plan. You need a Google account (a Gmail
          address).
        </p>
        <ol className="mt-4 flex list-decimal flex-col gap-3 pl-5">
          <li>
            Open{" "}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-primary underline"
            >
              aistudio.google.com/apikey
            </a>{" "}
            (it opens in a new tab). Sign in with your Google account if it asks.
          </li>
          <li>
            Click the button that says <strong>Create API key</strong>. If it asks you to pick a
            project, choose any one, or let it create a new one.
          </li>
          <li>
            A long line of letters and numbers appears. Click the <strong>copy</strong> icon next to
            it. That is your key.
          </li>
          <li>
            Come back to this page and scroll down to the box called{" "}
            <strong>“Google Gemini”</strong>, under the heading <strong>“Add your key here”</strong>
            .
          </li>
          <li>
            Click inside the box that says <strong>“Paste your key”</strong> and paste (Ctrl + V on
            a computer, or touch and hold, then Paste, on a phone).
          </li>
          <li>
            Click <strong>Save key</strong>. You can click <strong>Test key</strong> first to check
            it works. When it says “This key works”, you are done. The bar at the top of the page
            disappears.
          </li>
        </ol>
      </section>

      <section
        aria-label="Good to know"
        className="rounded-2xl border border-border bg-surface-2 p-5 text-sm"
      >
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            <strong>Your key stays on your own device.</strong> Prism does not keep it on a server.
          </li>
          <li>
            <strong>Do not share your key</strong> with anyone, and do not post it online.
          </li>
          <li>
            The free plan has a daily limit. If lessons stop one day, wait until tomorrow, or add a
            second free key from Groq (below).
          </li>
          <li>
            Only a real <strong>API key</strong> works. A paid chat plan (ChatGPT Plus, Claude Pro,
            Gemini Advanced) is not an API key.
          </li>
          <li>
            If you use another device or browser, add your key there too, because it is saved only
            where you add it.
          </li>
        </ul>
      </section>

      <h2 id="add-key" className="scroll-mt-24 text-2xl font-bold">
        Add your key here
      </h2>
    </div>
  );
}
