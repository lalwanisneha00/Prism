import { getAdmin } from "@/lib/firebase/admin";

/**
 * DELETE /api/account: "Delete my account and data". The caller proves who they are with
 * their Firebase ID token; the server then removes users/{uid} (every synced record) and
 * the sign-in account itself. The shared lesson library is not personal data and stays.
 */
export async function DELETE(req: Request) {
  const admin = await getAdmin();
  if (!admin) return Response.json({ error: "Accounts are not configured." }, { status: 503 });

  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return Response.json({ error: "Not signed in." }, { status: 401 });

  let uid: string;
  try {
    uid = (await admin.auth.verifyIdToken(token)).uid;
  } catch {
    return Response.json({ error: "Your sign-in has expired. Sign in again." }, { status: 401 });
  }

  try {
    await admin.db.recursiveDelete(admin.db.collection("users").doc(uid));
    await admin.auth.deleteUser(uid);
    return Response.json({ deleted: true });
  } catch (err) {
    console.error("[api/account] delete failed:", String(err));
    return Response.json({ error: "Could not delete the account. Try again." }, { status: 500 });
  }
}
