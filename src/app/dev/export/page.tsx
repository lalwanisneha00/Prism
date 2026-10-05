import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { ExportCheck } from "@/components/slides/ExportCheck";

export const metadata: Metadata = {
  title: "Export pictures (dev)",
  robots: { index: false },
};

/** Draws sample pictures the way slides and PDFs do, to check them by eye. Not linked anywhere. */
export default function ExportCheckPage() {
  return (
    <Container className="flex flex-col gap-6 py-10">
      <h1 className="text-2xl font-bold">Export pictures (dev)</h1>
      <ExportCheck />
    </Container>
  );
}
