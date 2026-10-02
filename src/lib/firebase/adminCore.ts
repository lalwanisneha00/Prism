import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/*
 * Firebase Admin SDK: full access to the project, so it only ever runs on the server
 * (route handlers and local scripts). Import via "@/lib/firebase/admin" in app code.
 */

export type AdminServices = { app: App; db: Firestore; auth: Auth };

let cached: AdminServices | null = null;

export function adminFromEnv(env: NodeJS.ProcessEnv): AdminServices | null {
  if (cached) return cached;
  const projectId = env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = env.FIREBASE_ADMIN_CLIENT_EMAIL;
  // Env files store the key's line breaks as "\n"; turn them back into real newlines.
  const privateKey = env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) return null;

  const app =
    getApps().find((a) => a.name === "prism-admin") ??
    initializeApp(
      { credential: cert({ projectId, clientEmail, privateKey }), projectId },
      "prism-admin",
    );
  cached = { app, db: getFirestore(app), auth: getAuth(app) };
  return cached;
}
