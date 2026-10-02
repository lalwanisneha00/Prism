import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { LibraryList } from "@/components/LibraryList";

export const metadata: Metadata = { title: "My library" };

export default function LibraryPage() {
  return (
    <Container className="flex flex-col gap-6 py-10 sm:py-14">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My library</h1>
        <p className="mt-2 text-muted">
          Lessons you saved on this device. They open instantly, even without internet.
        </p>
      </div>
      <LibraryList />
    </Container>
  );
}
