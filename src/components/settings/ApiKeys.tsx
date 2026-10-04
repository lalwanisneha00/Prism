"use client";

import { useCallback, useEffect, useId, useState } from "react";
import {
  KEY_HEADERS,
  PROVIDERS,
  looksLikeKey,
  validModel,
  type ProviderInfo,
} from "@/lib/byok/catalogue";
import { listApiKeys, maskKey, removeApiKey, saveApiKey, setActiveKey } from "@/lib/byok/store";
import type { StoredApiKey } from "@/lib/storage/db";

type Test =
  | { status: "idle" }
  | { status: "testing" }
  | { status: "ok" }
  | { status: "bad"; message: string };

const CUSTOM = "__custom__";

function ProviderCard({
  info,
  saved,
  onChanged,
}: {
  info: ProviderInfo;
  saved?: StoredApiKey;
  onChanged: () => void;
}) {
  const id = useId();
  const [key, setKey] = useState("");
  const [model, setModel] = useState(saved?.model ?? info.defaultModel);
  const known = info.models.some((m) => m.id === model);
  const [custom, setCustom] = useState(!known);
  const [test, setTest] = useState<Test>({ status: "idle" });
  const [error, setError] = useState("");

  const effectiveKey = key.trim() || saved?.key || "";

  async function save() {
    setError("");
    try {
      await saveApiKey({ provider: info.id, key: effectiveKey, model });
      setKey("");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the key.");
    }
  }

  async function runTest() {
    setTest({ status: "testing" });
    try {
      const res = await fetch("/api/test-key", {
        method: "POST",
        headers: {
          [KEY_HEADERS.provider]: info.id,
          [KEY_HEADERS.model]: model,
          [KEY_HEADERS.key]: effectiveKey,
        },
      });
      const body = (await res.json()) as { ok: boolean; message?: string };
      setTest(
        body.ok ? { status: "ok" } : { status: "bad", message: body.message ?? "The test failed." },
      );
    } catch {
      setTest({ status: "bad", message: "Couldn't reach Prism. Check your connection." });
    }
  }

  const canUse = looksLikeKey(effectiveKey) && validModel(model);
  const button =
    "rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-2 disabled:opacity-60";

  return (
    <li
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5"
      data-testid={`key-card-${info.id}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">{info.name}</h2>
        <span
          className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${info.free ? "border-success text-success" : "border-border text-muted"}`}
        >
          {info.freeNote}
        </span>
      </div>
      <p className="text-sm">
        <a
          href={info.keyUrl}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-primary underline"
        >
          Get a {info.name} key
        </a>
      </p>

      {saved && (
        <p className="text-sm text-muted">
          Saved on this device: <span className="font-mono">{maskKey(saved.key)}</span>
          {saved.active ? " · in use" : ""}
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm font-semibold" htmlFor={`${id}-key`}>
        {saved ? "Replace the key" : "Paste your key"}
        <input
          id={`${id}-key`}
          type="password"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          value={key}
          onChange={(e) => {
            setKey(e.target.value);
            setTest({ status: "idle" });
          }}
          placeholder={saved ? "Leave empty to keep the saved key" : "Paste it here"}
          className="rounded-xl border border-border bg-bg px-3 py-2 font-mono text-sm font-normal"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-semibold" htmlFor={`${id}-model`}>
        Model
        <select
          id={`${id}-model`}
          value={custom ? CUSTOM : model}
          onChange={(e) => {
            if (e.target.value === CUSTOM) setCustom(true);
            else {
              setCustom(false);
              setModel(e.target.value);
            }
            setTest({ status: "idle" });
          }}
          className="rounded-xl border border-border bg-bg px-3 py-2 text-sm font-normal"
        >
          {info.models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
          <option value={CUSTOM}>Another model (type its name)</option>
        </select>
      </label>
      {custom && (
        <label className="flex flex-col gap-1 text-sm font-semibold" htmlFor={`${id}-custom`}>
          Model name
          <input
            id={`${id}-custom`}
            value={model}
            onChange={(e) => setModel(e.target.value.trim())}
            className="rounded-xl border border-border bg-bg px-3 py-2 font-mono text-sm font-normal"
          />
        </label>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={!canUse} onClick={() => void save()} className={button}>
          {saved ? "Save changes" : "Save key"}
        </button>
        <button
          type="button"
          disabled={!canUse || test.status === "testing"}
          onClick={() => void runTest()}
          className={button}
        >
          {test.status === "testing" ? "Testing…" : "Test key"}
        </button>
        {saved && !saved.active && (
          <button
            type="button"
            onClick={() => void setActiveKey(info.id).then(onChanged)}
            className={button}
          >
            Use this key
          </button>
        )}
        {saved && (
          <button
            type="button"
            onClick={() => void removeApiKey(info.id).then(onChanged)}
            className="rounded-full border border-danger/40 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/10"
          >
            Remove key
          </button>
        )}
      </div>
      <div aria-live="polite" className="min-h-5 text-sm">
        {test.status === "ok" && <p className="text-success">This key works.</p>}
        {test.status === "bad" && <p className="text-danger">{test.message}</p>}
        {error && <p className="text-danger">{error}</p>}
      </div>
    </li>
  );
}

/** Settings → "Your API keys" (Feature A). */
export function ApiKeys() {
  const [keys, setKeys] = useState<StoredApiKey[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    listApiKeys()
      .then(setKeys)
      .catch(() => setFailed(true));
  }, []);
  useEffect(load, [load]);

  const active = keys?.find((k) => k.active);
  const activeName = PROVIDERS.find((p) => p.id === active?.id)?.name;

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-label="How your keys are handled"
        className="flex flex-col gap-2 rounded-2xl border border-border bg-surface-2 p-5 text-sm"
      >
        <p>
          <strong>Your key stays on this device.</strong> It is saved only in this browser. It is
          never sent to our database, never included in backups, exports or shared links, and never
          written to a log. When you make a lesson, it travels over HTTPS with that one request, is
          used once and forgotten.
        </p>
        <p>
          <strong>Only API keys work here.</strong> A paid chat subscription (Claude Pro or Max,
          ChatGPT Plus, the paid Gemini app) is <em>not</em> an API key and cannot be used. Get a
          key from the provider&apos;s developer page (the links below). Paid keys are billed to you
          by that provider, not by Prism.
        </p>
        <p>
          Lessons made with your own key go through the same source checks and fact-check as
          everyone&apos;s, and each lesson records which provider and model wrote it.
        </p>
      </section>

      <p className="text-sm" data-testid="key-indicator">
        {active ? `Using: your ${activeName} key (${active.model})` : "Using: Prism's shared key"}
        {keys && keys.length > 0 && active && (
          <>
            {" "}
            ·{" "}
            <button
              type="button"
              onClick={() => void setActiveKey(null).then(load)}
              className="font-semibold text-primary underline"
            >
              Use Prism&apos;s shared key instead
            </button>
          </>
        )}
      </p>

      {failed && (
        <p role="alert" className="rounded-2xl border border-border bg-surface p-5">
          This browser is blocking storage, so a key can&apos;t be kept here.
        </p>
      )}
      {!keys && !failed && (
        <div className="h-40 animate-pulse rounded-2xl bg-surface-2" aria-busy="true" />
      )}
      {keys && (
        <ul className="grid gap-4 lg:grid-cols-2">
          {PROVIDERS.map((p) => (
            <ProviderCard
              key={p.id}
              info={p}
              saved={keys.find((k) => k.id === p.id)}
              onChanged={load}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
