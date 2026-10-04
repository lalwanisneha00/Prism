import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { ViewCustomSubject } from "@/components/custom/CustomSubjectPages";

export const metadata: Metadata = { title: "My subject" };

export default async function ViewSubjectPage({ searchParams }: PageProps<"/my-subjects/view">) {
  const { id } = await searchParams;
  return (
    <Container className="py-10 sm:py-14">
      <ViewCustomSubject id={typeof id === "string" ? id : ""} />
    </Container>
  );
}
