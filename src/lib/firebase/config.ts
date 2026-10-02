import type { FirebaseOptions } from "firebase/app";

/*
 * The Firebase web config. These values are public by design (every visitor's browser
 * receives them); security comes from the Firestore rules, not from hiding them.
 * Each variable is written out in full so Next.js can inline it into the browser bundle.
 */
const config: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** The config, or null when accounts aren't set up (the app then runs in guest-only mode). */
export function firebaseConfig(): FirebaseOptions | null {
  return config.apiKey && config.projectId && config.appId ? config : null;
}
