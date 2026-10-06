import { Container } from "@/components/Container";

/** Shown at once while any page is on its way: the shape of a page, never a frozen screen. */
export default function Loading() {
  return (
    <Container className="flex flex-col gap-6 py-10 sm:py-14">
      <div
        role="status"
        aria-label="Loading"
        aria-busy="true"
        className="h-9 w-2/3 max-w-md animate-pulse rounded-lg bg-surface-2"
      />
      <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-surface-2" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface-2" />
        ))}
      </div>
    </Container>
  );
}
