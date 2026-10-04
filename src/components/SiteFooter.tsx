import Link from "next/link";
import { Container } from "@/components/Container";
import { FLAGS } from "@/lib/flags";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border py-8 text-sm text-muted">
      <Container className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <p>
          AI can make mistakes. Every claim in a lesson links to its source, so you can check it.{" "}
          <Link
            href="/accuracy"
            className="font-semibold text-primary underline underline-offset-2"
          >
            How accurate is Prism?
          </Link>
        </p>
        <p className="shrink-0">
          {FLAGS.slidesPdf && (
            <>
              <Link href="/slides" className="underline underline-offset-2">
                My slides and PDFs
              </Link>{" "}
              ·{" "}
            </>
          )}
          {FLAGS.byoKey && (
            <>
              <Link href="/settings/keys" className="underline underline-offset-2">
                Your API keys
              </Link>{" "}
              ·{" "}
            </>
          )}
          © {site.name}
        </p>
      </Container>
    </footer>
  );
}
