import { notFound } from "next/navigation";

/** Developer pages exist for checking by eye; the live site does not serve them (the test server does). */
export function devOnly() {
  if (process.env.NODE_ENV === "production" && process.env.LLM_PROVIDER !== "fake") notFound();
}
