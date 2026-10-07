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
    return adminFromEnv(process.env);
  } catch (err) {
    console.error("[firebase-admin] could not be loaded:", String(err));
    return null;
  }
}
