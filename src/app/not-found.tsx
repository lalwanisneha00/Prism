import Link from "next/link";
import { Container } from "@/components/Container";

export default function NotFound() {
  return (
    <Container className="flex flex-col items-start gap-4 py-16">
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="text-3xl font-bold tracking-tight">This page doesn&apos;t exist</h1>
      <p className="text-muted">The link may be old or mistyped.</p>
      <Link
        href="/"
        className="rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-fg hover:bg-primary-hover"
      >
        Go to the home page
      </Link>
    </Container>
  );
}
