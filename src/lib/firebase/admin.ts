import "server-only";
import { adminFromEnv } from "@/lib/firebase/adminCore";

export { adminFromEnv } from "@/lib/firebase/adminCore";

/** The Admin SDK for route handlers, or null when the server key isn't configured. */
export const getAdmin = () => adminFromEnv(process.env);
