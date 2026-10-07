import { Icon } from "@/components/Icon";
import Link from "next/link";
import { AccountMenu } from "@/components/account/AccountMenu";
import { Container } from "@/components/Container";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg">
      <Container className="flex h-16 items-center justify-between">
        <Logo />
        <nav aria-label="Main" className="flex items-center gap-0 sm:gap-2">
          <Link
            href="/start"
            className="rounded-full px-1.5 py-2 text-sm font-semibold hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-3"
            data-testid="nav-start-lesson"
          >
            <Icon name="idea" />
            <span className="max-sm:sr-only"> Start a lesson</span>
          </Link>
          <Link
            href="/subjects"
            className="rounded-full px-1.5 py-2 text-sm font-semibold hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-3"
          >
            <Icon name="study" />
            <span className="max-sm:sr-only"> Subjects</span>
          </Link>
          <Link
            href="/library"
            className="rounded-full px-1.5 py-2 text-sm font-semibold hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-3"
          >
            <Icon name="library" />
            <span className="max-sm:sr-only"> Library</span>
          </Link>
          <Link
            href="/notes"
            className="rounded-full px-1.5 py-2 text-sm font-semibold hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-3"
          >
            <Icon name="book" />
            <span className="max-sm:sr-only"> Uploads</span>
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full px-1.5 py-2 text-sm font-semibold hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-3"
          >
            <Icon name="chart" />
            <span className="max-sm:sr-only"> Dashboard</span>
          </Link>
          <ThemeToggle />
          <AccountMenu />
        </nav>
      </Container>
    </header>
  );
}
