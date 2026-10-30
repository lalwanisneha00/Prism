import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { normalizePrivateKey } from "@/lib/firebase/adminKey";

/*
 * Firebase Admin SDK: full access to the project, so it only ever runs on the server
 * (route handlers and local scripts). Import via "@/lib/firebase/admin" in app code.
 */

export type AdminServices = { app: App; db: Firestore; auth: Auth };

let cached: AdminServices | null = null;

export function adminFromEnv(env: NodeJS.ProcessEnv): AdminServices | null {
  if (cached) return cached;
  const projectId = env.FIREBASE_ADMIN_PROJECT_ID?.trim();
  const clientEmail = env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
  // Env files store the key's line breaks as "\n" (and dashboards may keep its quotes).
  const privateKey = normalizePrivateKey(env.FIREBASE_ADMIN_PRIVATE_KEY);
  if (!projectId || !clientEmail || !privateKey) return null;

  const app =
    getApps().find((a) => a.name === "prism-admin") ??
    initializeApp(
      { credential: cert({ projectId, clientEmail, privateKey }), projectId },
      "prism-admin",
    );
  cached = { app, db: firestoreOf(app), auth: getAuth(app) };
  return cached;
}

/**
 * Firestore that leaves out empty (undefined) fields instead of refusing the whole write, as the
 * browser's does: an optional field left empty once stopped every syllabus fix from going live.
 */
function firestoreOf(app: App): Firestore {
  const db = getFirestore(app);
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    // Already set up in this process (dev reloads): it has the setting from the first time.
  }
  return db;
}
