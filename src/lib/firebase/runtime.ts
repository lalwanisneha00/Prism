/*
 * Everything that needs the Firebase SDK in the browser, in one module that is loaded on demand
 * (after the first paint), so no page pays for ~180 KB of JavaScript before it shows anything.
 */
export {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
export { FirebaseError } from "firebase/app";
export { getClientServices } from "@/lib/firebase/client";
export { firestoreAdapter, indexedDbAdapter } from "@/lib/sync/adapters";
export { SyncEngine } from "@/lib/sync/engine";
