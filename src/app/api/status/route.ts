import { adminLoadError, getAdmin } from "@/lib/firebase/admin";
import { adminEnvStatus } from "@/lib/firebase/adminKey";

/*
 * GET /api/status: is the server's database access (reports, votes, the shared lesson library)
 * set up? Yes/no answers only, never a setting's value, so it is safe to open on the live site.
 */

export async function GET(req: Request) {
  void req; // A request argument keeps this route from being cached at build time.
  const env = adminEnvStatus(process.env);
  const admin = await getAdmin();
  let database: "ok" | "not-set-up" | string = "not-set-up";
  if (admin) {
    try {
      await admin.db.collection("syllabusProposals").limit(1).get();
      database = "ok";
    } catch (err) {
      database = `error: ${String(err).slice(0, 200)}`;
    }
  }
  return Response.json(
    {
      firebaseAdmin: { ...env, loadError: adminLoadError()?.slice(0, 200) ?? null, database },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
