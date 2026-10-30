/*
 * The Firebase admin key as hosting dashboards store it. Pasting into Vercel often keeps the
 * .env quotes, or turns "\n" into real line breaks (or the other way round): accept all of them.
 */

/** The private key in PEM form, or undefined when none is set. */
export function normalizePrivateKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let key = raw.trim();
  if (
    key.length >= 2 &&
    ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'")))
  )
    key = key.slice(1, -1).trim();
  key = key.replace(/\\r/g, "").replace(/\\n/g, "\n").replace(/\r/g, "").trim();
  return key || undefined;
}

export type AdminEnvStatus = {
  projectId: boolean;
  clientEmail: boolean;
  privateKey: "missing" | "not-a-private-key" | "ok";
};

/** Which admin settings are present and usable. Yes/no only: never the values themselves. */
export function adminEnvStatus(env: NodeJS.ProcessEnv): AdminEnvStatus {
  const key = normalizePrivateKey(env.FIREBASE_ADMIN_PRIVATE_KEY);
  return {
    projectId: Boolean(env.FIREBASE_ADMIN_PROJECT_ID?.trim()),
    clientEmail: Boolean(env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim()),
    privateKey: !key
      ? "missing"
      : /-----BEGIN PRIVATE KEY-----\n[\s\S]+\n-----END PRIVATE KEY-----/.test(key)
        ? "ok"
        : "not-a-private-key",
  };
}
