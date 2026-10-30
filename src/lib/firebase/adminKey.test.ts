import { describe, expect, it } from "vitest";
import { adminEnvStatus, normalizePrivateKey } from "@/lib/firebase/adminKey";

// A real key's body is base64 in lines of 64 characters.
const BODY = ["A".repeat(64), "B".repeat(64), "CDEF"];
const PEM = `-----BEGIN PRIVATE KEY-----\n${BODY.join("\n")}\n-----END PRIVATE KEY-----\n`;
const escaped = PEM.replace(/\n/g, "\\n");

describe("normalizePrivateKey", () => {
  it("turns written \\n into line breaks", () => {
    expect(normalizePrivateKey(escaped)).toBe(PEM.trim());
  });
  it("drops quotes kept from the .env file", () => {
    expect(normalizePrivateKey(`"${escaped}"`)).toBe(PEM.trim());
    expect(normalizePrivateKey(`'${escaped}'`)).toBe(PEM.trim());
  });
  it("keeps real line breaks (also Windows ones)", () => {
    expect(normalizePrivateKey(PEM.replace(/\n/g, "\r\n"))).toBe(PEM.trim());
  });
  it("rebuilds a key whose line breaks became spaces", () => {
    expect(normalizePrivateKey(PEM.replace(/\n/g, " "))).toBe(PEM.trim());
  });
  it("treats empty as not set", () => {
    expect(normalizePrivateKey(undefined)).toBeUndefined();
    expect(normalizePrivateKey('  ""  ')).toBeUndefined();
  });
});

describe("adminEnvStatus", () => {
  it("says what is missing, never the values", () => {
    expect(
      adminEnvStatus({ FIREBASE_ADMIN_PROJECT_ID: "p" } as unknown as NodeJS.ProcessEnv),
    ).toEqual({
      projectId: true,
      clientEmail: false,
      privateKey: "missing",
    });
  });
  it("spots a value that is not a private key", () => {
    const env = { FIREBASE_ADMIN_PRIVATE_KEY: "my-api-key" } as unknown as NodeJS.ProcessEnv;
    expect(adminEnvStatus(env).privateKey).toBe("not-a-private-key");
  });
  it("accepts a quoted, escaped key", () => {
    const env = { FIREBASE_ADMIN_PRIVATE_KEY: `"${escaped}"` } as unknown as NodeJS.ProcessEnv;
    expect(adminEnvStatus(env).privateKey).toBe("ok");
  });
});
