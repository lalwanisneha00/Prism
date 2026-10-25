import { z } from "zod";
import type { getAdmin } from "@/lib/firebase/admin";

/*
 * Who is sending a fix (syllabus fix, Phases 3 and 4): the signed-in student and their branch,
 * semester and batch. Their synced settings on the server are trusted over what the app sends.
 * Server-only (the routes call it with the Admin SDK).
 */

export const ProfileSchema = z.object({
  branch: z.string().trim().min(1).max(40).optional(),
  semester: z.int().min(1).max(8).optional(),
  batchYear: z.int().min(2000).max(2100).optional(),
});
export type Profile = z.infer<typeof ProfileSchema>;

type Admin = NonNullable<Awaited<ReturnType<typeof getAdmin>>>;

export type Student =
  | { ok: true; uid: string; profile: Profile; profileFrom: "cloud" | "device" }
  | { ok: false; kind: "signed-out"; message: string };

/** The student's branch, semester and batch from their synced settings. */
async function cloudProfile(db: Admin["db"], uid: string): Promise<Profile | null> {
  try {
    const snap = await db.collection("users").doc(uid).collection("settings").doc("app").get();
    const parsed = ProfileSchema.safeParse(snap.data() ?? {});
    return snap.exists && parsed.success && parsed.data.branch ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Checks the Firebase ID token and reads the profile (cloud first, else the app's `device`). */
export async function signedInStudent(
  req: Request,
  admin: Admin,
  device: Profile,
  what = "send this",
): Promise<Student> {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return { ok: false, kind: "signed-out", message: `Sign in to ${what}.` };
  let uid: string;
  try {
    uid = (await admin.auth.verifyIdToken(token)).uid;
  } catch {
    return { ok: false, kind: "signed-out", message: "Your sign-in has expired. Sign in again." };
  }
  const cloud = await cloudProfile(admin.db, uid);
  return cloud
    ? { ok: true, uid, profile: { ...device, ...cloud }, profileFrom: "cloud" }
    : { ok: true, uid, profile: device, profileFrom: "device" };
}
