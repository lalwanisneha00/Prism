import type { Metadata } from "next";
import { AccountPanel } from "@/components/account/AccountPanel";
import { Container } from "@/components/Container";

export const metadata: Metadata = { title: "Account" };

export default function AccountPage() {
  return (
    <Container className="flex flex-col gap-6 py-10 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight">Account, backup &amp; privacy</h1>
      <AccountPanel />
    </Container>
  );
}
