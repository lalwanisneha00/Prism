import { Container } from "@/components/Container";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border py-8 text-sm text-muted">
      <Container className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <p>
          AI can make mistakes. Every claim in a lesson links to its source, so you can check it.
        </p>
        <p className="shrink-0">© {site.name}</p>
      </Container>
    </footer>
  );
}
