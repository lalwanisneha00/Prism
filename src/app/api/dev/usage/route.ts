import { libraryUsage } from "@/lib/library/sharedLibrary";

/** Server-side Firestore usage since this server started (shared library reads/writes). */
export function GET() {
  return Response.json(libraryUsage, { headers: { "cache-control": "no-store" } });
}
