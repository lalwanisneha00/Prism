import "server-only";
import type { AdminServices } from "@/lib/firebase/adminCore";

/*
 * The Admin SDK for route handlers. It is loaded only when a request needs it, and a failure to
 * load it (for example a hosting problem with that library) means "not available", never a crashed
 * route: lessons must keep working without the shared lesson library.
 */
export async function getAdmin(): Promise<AdminServices | null> {
  try {
    const { adminFromEnv } = await import("@/lib/firebase/adminCore");
    lastError = null;
    return adminFromEnv(process.env);
  } catch (err) {
    lastError = String(err);
    console.error("[firebase-admin] could not be loaded:", lastError);
    return null;
  }
}

let lastError: string | null = null;

/** Why the last getAdmin() failed (for the status page), or null. */
export const adminLoadError = () => lastError;
