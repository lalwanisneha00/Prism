import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { CustomSubjectForm } from "@/components/custom/CustomSubjectForm";

export const metadata: Metadata = { title: "Add my own subject" };

export default async function NewSubjectPage({ searchParams }: PageProps<"/my-subjects/new">) {
  const { name } = await searchParams;
  return (
    <Container className="flex flex-col gap-6 py-10 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight">Add my own subject</h1>
      <CustomSubjectForm initialName={typeof name === "string" ? name.slice(0, 120) : ""} />
    </Container>
  );
}
