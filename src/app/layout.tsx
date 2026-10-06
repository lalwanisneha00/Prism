import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono, Source_Sans_3 } from "next/font/google";
import { AuthProvider } from "@/components/account/AuthProvider";
import { DbBlockedNotice } from "@/components/DbBlockedNotice";
import { NavProgress } from "@/components/NavProgress";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { FLAGS } from "@/lib/flags";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { TestModeBanner } from "@/components/TestModeBanner";
import { site } from "@/lib/site";
import { themeScript } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// The reading face for the whole interface and the display face for headings (Feature C).
const sourceSans = Source_Sans_3({ variable: "--font-source", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["opsz"] });

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.description,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4efe4" },
    { media: "(prefers-color-scheme: dark)", color: "#14181f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      data-look={FLAGS.redesign ? "new" : "classic"}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${sourceSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript(FLAGS.redesign) }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-fg"
        >
          Skip to content
        </a>
        <TestModeBanner />
        <AuthProvider>
          <NavProgress />
          <DbBlockedNotice />
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
          <KeyboardShortcuts />
        </AuthProvider>
      </body>
    </html>
  );
}
