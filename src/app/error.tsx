"use client";

import Link from "next/link";
import { Container } from "@/components/Container";

/** Shown if a page crashes unexpectedly, instead of a blank screen. */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <Container className="flex flex-col items-start gap-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Something went wrong</h1>
      <p className="text-muted">
        Sorry, this page hit an unexpected problem. Your saved lessons are safe on this device.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-fg hover:bg-primary-hover"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border border-border px-5 py-2.5 font-semibold hover:bg-surface-2"
        >
          Go home
        </Link>
      </div>
    </Container>
  );
}
