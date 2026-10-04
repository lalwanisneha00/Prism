import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { EditCustomSubject } from "@/components/custom/CustomSubjectPages";

export const metadata: Metadata = { title: "Edit my subject" };

export default async function EditSubjectPage({ searchParams }: PageProps<"/my-subjects/edit">) {
  const { id } = await searchParams;
  return (
    <Container className="flex flex-col gap-6 py-10 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight">Edit my subject</h1>
      <EditCustomSubject id={typeof id === "string" ? id : ""} />
    </Container>
  );
}
