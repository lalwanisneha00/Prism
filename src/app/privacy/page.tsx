import type { Metadata } from "next";
import { Container } from "@/components/Container";

export const metadata: Metadata = { title: "Privacy" };

const points: [string, string][] = [
  [
    "Guest by default",
    "Prism works without an account. As a guest, everything stays in this browser on this device.",
  ],
  [
    "What an account stores",
    "If you sign in with Google, we store your name, email and photo (from Google) and what you study: saved lessons, recent topics, quiz scores, audio positions and settings. Nothing else.",
  ],
  [
    "Where it lives",
    "Your data is kept in Google Firebase, in your own private folder that only your account can read. Lessons are also kept on your device so the app is fast and works offline.",
  ],
  [
    "The shared lesson library",
    "When the AI writes and fact-checks a lesson, a copy is kept (without any personal details) so the next student who asks for the same topic gets it instantly.",
  ],
  [
    "Your files",
    "PDF notes you upload are read in your browser and stay on this device; only their names and a short summary sync. When you build a lesson from your notes, the few matching passages (at most 8) are sent to the AI to write it, and that lesson is never added to the shared library.",
  ],
  ["No ads, no tracking", "We don't show ads, sell data or use tracking cookies."],
  [
    "Your control",
    "Download a backup at any time, sign out to remove your data from a device, or delete your account and all its data from the Account page.",
  ],
];

export default function PrivacyPage() {
  return (
    <Container className="flex flex-col gap-6 py-10 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight">Privacy note</h1>
      <dl className="flex flex-col gap-4">
        {points.map(([title, text]) => (
          <div key={title} className="rounded-2xl border border-border bg-surface p-5">
            <dt className="font-semibold">{title}</dt>
            <dd className="mt-1 text-muted">{text}</dd>
          </div>
        ))}
      </dl>
    </Container>
  );
}
