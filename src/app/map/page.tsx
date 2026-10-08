import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { CustomMapRoute } from "@/components/custom/CustomRoutes";
import { MapStart } from "@/components/map/MapStart";
import { MapSubjectPicker } from "@/components/map/MapSubjectPicker";
import { SubjectGraphLoader } from "@/components/map/SubjectGraphLoader";
import { indexedSubject } from "@/lib/catalogue";
import { isCustomId } from "@/lib/custom/customSubject";

export const metadata: Metadata = { title: "Concept map" };

export default async function MapPage({ searchParams }: PageProps<"/map">) {
  const { subject: raw } = await searchParams;
  if (typeof raw === "string" && isCustomId(raw)) {
    return (
      <Container className="flex flex-col gap-6 py-10 sm:py-14">
        <CustomMapRoute id={raw} />
      </Container>
    );
  }
  const subject = typeof raw === "string" ? indexedSubject(raw) : undefined;

  return (
    <Container className="flex flex-col gap-6 py-10 sm:py-14">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Concept map</h1>
        <p className="mt-2 text-muted">
          Every topic and what it builds on. Arrows go from what to learn first to what it unlocks;
          colours show your latest quiz results.
        </p>
      </div>
      {subject ? (
        <>
          <MapSubjectPicker currentId={subject.id} />
          <SubjectGraphLoader subjectId={subject.id} />
        </>
      ) : (
        <MapStart />
      )}
    </Container>
  );
}
