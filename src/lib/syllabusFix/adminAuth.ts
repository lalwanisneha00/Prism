import type { getAdmin } from "@/lib/firebase/admin";

/*
 * Who may use the admin page (syllabus fix, Phase 6): only the Firebase accounts listed in the
 * server's ADMIN_UID setting (one uid, or several separated by commas). Checked on the server for
 * every admin request; hiding the page in the app is not what keeps others out.
 */

/** The admin uids from the environment (empty = nobody is admin). */
export function adminUids(env: NodeJS.ProcessEnv = process.env): string[] {
  return (env.ADMIN_UID ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const isAdminUid = (uid: string, env: NodeJS.ProcessEnv = process.env) =>
  adminUids(env).includes(uid);

type Admin = NonNullable<Awaited<ReturnType<typeof getAdmin>>>;

export type AdminCheck =
  | { ok: true; uid: string }
  | { ok: false; status: 401 | 403; kind: "signed-out" | "not-admin"; message: string };

/** Checks the Firebase ID token and that its account is an admin. */
export async function signedInAdmin(
  req: Request,
  admin: Admin,
  env: NodeJS.ProcessEnv = process.env,
): Promise<AdminCheck> {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token)
    return { ok: false, status: 401, kind: "signed-out", message: "Sign in to open this page." };
  let uid: string;
  try {
    uid = (await admin.auth.verifyIdToken(token)).uid;
  } catch {
    return {
      ok: false,
      status: 401,
      kind: "signed-out",
      message: "Your sign-in has expired. Sign in again.",
    };
  }
  if (!isAdminUid(uid, env))
    return {
      ok: false,
      status: 403,
      kind: "not-admin",
      message: "This page is only for the Prism admin.",
    };
  return { ok: true, uid };
}
