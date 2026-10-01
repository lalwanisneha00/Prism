/** The last-resort visual (SPEC §4.6): a clean card stating the key idea. */
export function KeyIdeaCard({ caption }: { caption: string }) {
  return (
    <figure className="flex items-start gap-3 rounded-xl border border-border bg-primary-soft p-4">
      <span aria-hidden="true" className="text-2xl">
        💡
      </span>
      <div>
        <p className="text-sm font-semibold text-primary">Key idea</p>
        <figcaption className="mt-0.5">{caption}</figcaption>
      </div>
    </figure>
  );
}
