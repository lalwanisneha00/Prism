import { Icon } from "@/components/Icon";

/** The last-resort visual (SPEC §4.6): a clean card stating the key idea. */
export function KeyIdeaCard({ caption }: { caption: string }) {
  return (
    <figure className="flex items-start gap-3 rounded-xl border border-border bg-primary-soft p-4">
      <Icon name="idea" className="mt-0.5 size-6 text-primary" />
      <div>
        <p className="text-sm font-semibold text-primary">Key idea</p>
        <figcaption className="mt-0.5">{caption}</figcaption>
      </div>
    </figure>
  );
}
