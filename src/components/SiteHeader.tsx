import Link from "next/link";
import { AccountMenu } from "@/components/account/AccountMenu";
import { Container } from "@/components/Container";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <Logo />
        <nav aria-label="Main" className="flex items-center gap-0.5 sm:gap-2">
          <Link
            href="/subjects"
            className="rounded-full px-2 py-2 text-sm font-semibold hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-3"
          >
            <span aria-hidden="true">🎓</span>
            <span className="max-sm:sr-only"> Subjects</span>
          </Link>
          <Link
            href="/library"
            className="rounded-full px-2 py-2 text-sm font-semibold hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-3"
          >
            <span aria-hidden="true">📚</span>
            <span className="max-sm:sr-only"> Library</span>
          </Link>
          <Link
            href="/notes"
            className="rounded-full px-2 py-2 text-sm font-semibold hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-3"
          >
            <span aria-hidden="true">📒</span>
            <span className="max-sm:sr-only"> Uploads</span>
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full px-2 py-2 text-sm font-semibold hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-3"
          >
            <span aria-hidden="true">📊</span>
            <span className="max-sm:sr-only"> Dashboard</span>
          </Link>
          <ThemeToggle />
          <AccountMenu />
        </nav>
      </Container>
    </header>
  );
}
