import Link from "next/link";
import { Container } from "@/components/Container";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <Logo />
        <nav aria-label="Main" className="flex items-center gap-2">
          <Link
            href="/library"
            className="rounded-full px-3 py-2 text-sm font-semibold hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span aria-hidden="true">📚 </span>Library
          </Link>
          <ThemeToggle />
        </nav>
      </Container>
    </header>
  );
}
