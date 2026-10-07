import { AccountMenu } from "@/components/account/AccountMenu";
import { Container } from "@/components/Container";
import { Logo } from "@/components/Logo";
import { MainNav } from "@/components/MainNav";
import { ThemeToggle } from "@/components/ThemeToggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg">
      <Container className="flex flex-wrap items-center gap-x-3 py-2 lg:h-[4.5rem] lg:flex-nowrap lg:py-0">
        <div className="order-1">
          <Logo />
        </div>
        <MainNav />
        <div className="order-2 ml-auto flex items-center gap-1 lg:order-3 lg:ml-0">
          <ThemeToggle />
          <AccountMenu />
        </div>
      </Container>
    </header>
  );
}
