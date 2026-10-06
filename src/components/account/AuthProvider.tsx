"use client";

import type { User } from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { firebaseConfig } from "@/lib/firebase/config";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import { getSettings } from "@/lib/storage/progress";
import { clearLocalData, onLocalChange, setMeta } from "@/lib/storage/records";
import type { SyncEngine, SyncStatus } from "@/lib/sync/engine";

/** The Firebase code, fetched when first needed (never in the first page load). */
type Runtime = typeof import("@/lib/firebase/runtime");
const loadRuntime = () => import("@/lib/firebase/runtime");

export type AuthStatus = "loading" | "signed-out" | "signed-in" | "unavailable";

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  sync: SyncStatus | null;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{ ok: boolean; error?: string }>;
  syncNow: () => void;
  /** Goes up whenever the cloud copy changed this device's data, so lists can re-read. */
  dataVersion: number;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** The data version only (0 outside an AuthProvider, e.g. in tests): bumps when synced data changes. */
export function useDataVersion(): number {
  return useContext(AuthContext)?.dataVersion ?? 0;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}

/** "Already downloaded the cloud copy in this tab session" (SPEC: load once per session). */
const sessionPulls = {
  pulled: (uid: string) => {
    try {
      return sessionStorage.getItem(`prism-pulled:${uid}`) === "1";
    } catch {
      return false;
    }
  },
  markPulled: (uid: string) => {
    try {
      sessionStorage.setItem(`prism-pulled:${uid}`, "1");
    } catch {
      // Not remembered: the next page load downloads again (a few extra reads, nothing lost).
    }
  },
};

/** Puts synced settings (theme, audio speed) into effect on this device. */
async function applySyncedSettings() {
  const settings = await getSettings();
  try {
    if (settings?.theme) {
      localStorage.setItem(THEME_STORAGE_KEY, settings.theme);
      document.documentElement.setAttribute("data-theme", settings.theme);
    }
    if (settings?.audioRate) localStorage.setItem("prism-audio-rate", String(settings.audioRate));
  } catch {
    // Storage blocked: the settings still apply in the cloud copy.
  }
}

const FLUSH_DELAY_MS = 2000;

/**
 * Google sign-in plus background sync. Without Firebase settings (or before sign-in) the app
 * runs in guest mode on the device copy alone.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(() =>
    firebaseConfig() ? "loading" : "unavailable",
  );
  const [user, setUser] = useState<User | null>(null);
  const [sync, setSync] = useState<SyncStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const engine = useRef<SyncEngine | null>(null);

  useEffect(() => {
    if (!firebaseConfig()) return;
    let stopped = false;
    let teardown: (() => void) | undefined;
    // Let the page paint and become usable first; the sign-in state follows a moment later.
    const idle = (cb: () => void) =>
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(cb, { timeout: 1500 })
        : window.setTimeout(cb, 300);
    idle(() => {
      void loadRuntime().then((rt) => {
        if (!stopped) teardown = begin(rt);
      });
    });
    return () => {
      stopped = true;
      teardown?.();
    };

    function begin(rt: Runtime): (() => void) | undefined {
      const services = rt.getClientServices();
      if (!services) return undefined;
      return listen(rt, services);
    }

    function listen(rt: Runtime, services: NonNullable<ReturnType<Runtime["getClientServices"]>>) {
      let cleanupSync: (() => void) | null = null;

      const unsubscribe = rt.onAuthStateChanged(services.auth, (next) => {
        cleanupSync?.();
        cleanupSync = null;
        engine.current?.stop();
        engine.current = null;
        setUser(next);
        setStatus(next ? "signed-in" : "signed-out");
        setSync(null);
        if (!next) return;

        const e = new rt.SyncEngine({
          uid: next.uid,
          local: rt.indexedDbAdapter,
          remote: rt.firestoreAdapter(services.db, next.uid),
          onStatus: setSync,
          isOnline: () => navigator.onLine,
          session: sessionPulls,
        });
        engine.current = e;
        e.start()
          .then(applySyncedSettings)
          .then(() => setDataVersion((v) => v + 1))
          .catch((err: unknown) => console.warn("[sync] start failed", err));

        // Upload shortly after changes (batched), when back online, and when leaving the page.
        let timer: ReturnType<typeof setTimeout> | undefined;
        const stopListening = onLocalChange(() => {
          clearTimeout(timer);
          timer = setTimeout(() => void e.flush(), FLUSH_DELAY_MS);
        });
        const flushNow = () => void e.flush();
        const onHidden = () => document.visibilityState === "hidden" && flushNow();
        const onOffline = () => setSync("offline");
        const retry = setInterval(flushNow, 60_000);
        window.addEventListener("online", flushNow);
        window.addEventListener("offline", onOffline);
        document.addEventListener("visibilitychange", onHidden);
        cleanupSync = () => {
          clearTimeout(timer);
          clearInterval(retry);
          stopListening();
          window.removeEventListener("online", flushNow);
          window.removeEventListener("offline", onOffline);
          document.removeEventListener("visibilitychange", onHidden);
        };
      });

      return () => {
        unsubscribe();
        cleanupSync?.();
        engine.current?.stop();
      };
    }
  }, []);

  const signIn = useCallback(async () => {
    const rt = await loadRuntime();
    const services = rt.getClientServices();
    if (!services) return;
    setError(null);
    const provider = new rt.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      await rt.signInWithPopup(services.auth, provider);
    } catch (err) {
      const code = err instanceof rt.FirebaseError ? err.code : "";
      if (code === "auth/popup-blocked") return rt.signInWithRedirect(services.auth, provider);
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
      setError(
        code === "auth/unauthorized-domain"
          ? "This website isn't on the sign-in list yet (Firebase → Authentication → Settings → Authorized domains)."
          : "Sign-in didn't work. Check your connection and try again.",
      );
    }
  }, []);

  const signOut = useCallback(async () => {
    const rt = await loadRuntime();
    const services = rt.getClientServices();
    if (!services) return;
    // Give pending changes a moment to reach the cloud, then clear this device for privacy.
    await Promise.race([engine.current?.flush(), new Promise((r) => setTimeout(r, 4000))]);
    engine.current?.stop();
    engine.current = null;
    await clearLocalData();
    await setMeta("ownerUid", null);
    await rt.signOut(services.auth);
    setDataVersion((v) => v + 1);
  }, []);

  const deleteAccount = useCallback(async () => {
    const rt = await loadRuntime();
    const current = rt.getClientServices()?.auth.currentUser;
    if (!current) return { ok: false, error: "Not signed in." };
    try {
      const token = await current.getIdToken(true);
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        return { ok: false, error: body.error ?? "Could not delete the account." };
      }
      engine.current?.stop();
      engine.current = null;
      await clearLocalData();
      await setMeta("ownerUid", null);
      await rt.signOut(rt.getClientServices()!.auth);
      return { ok: true };
    } catch {
      return { ok: false, error: "Could not reach the server. Check your connection." };
    }
  }, []);

  const syncNow = useCallback(() => void engine.current?.flush(), []);

  return (
    <AuthContext.Provider
      value={{ status, user, sync, error, signIn, signOut, deleteAccount, syncNow, dataVersion }}
    >
      {children}
    </AuthContext.Provider>
  );
}
