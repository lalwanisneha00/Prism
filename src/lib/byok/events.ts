/** Fired in the browser whenever the student's saved keys change, so the top bar can update. */
export const KEYS_CHANGED_EVENT = "prism-keys-changed";

export function announceKeysChanged(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(KEYS_CHANGED_EVENT));
}
