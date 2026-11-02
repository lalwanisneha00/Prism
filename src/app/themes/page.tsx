import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { ThemePicker } from "@/components/themes/ThemePicker";

export const metadata: Metadata = { title: "Themes" };

export default function ThemesPage() {
  return (
    <Container className="py-10 sm:py-14">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold sm:text-4xl">Choose a theme</h1>
          <p className="max-w-2xl text-muted">
            Each theme changes the fonts, corners, textures and colours of the whole app. Pick one
            to see a larger preview, try it on every page, then keep it or go back.
          </p>
        </div>
        <ThemePicker />
      </div>
    </Container>
  );
}
