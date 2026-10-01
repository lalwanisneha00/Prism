import { site } from "@/lib/site";

// Temporary placeholder. The real home page is built in V1 · Step 2.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">{site.name}</h1>
      <p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">{site.tagline}</p>
      <p className="rounded-full bg-emerald-100 px-4 py-1 text-sm font-medium text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100">
        ✓ Setup complete: V1 · Step 1
      </p>
    </main>
  );
}
