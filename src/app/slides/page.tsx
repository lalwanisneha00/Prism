import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/Container";
import { MySlides } from "@/components/slides/MySlides";
import { FLAGS } from "@/lib/flags";

export const metadata: Metadata = { title: "My slides and PDFs" };

export default function SlidesPage() {
  if (!FLAGS.slidesPdf) notFound();
  return (
    <Container className="flex flex-col gap-6 py-10 sm:py-14">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My slides and PDFs</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Files you made are kept in this browser so you can download them again. They are not
          uploaded anywhere.
        </p>
      </div>
      <MySlides />
    </Container>
  );
}
