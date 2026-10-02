"use client";

import { useEffect, useState } from "react";
import { getMeta } from "@/lib/storage/records";
import { todayKey, type UsageCounts } from "@/lib/sync/engine";

/** Spark (free) plan limits we design around (SPEC §9.1). */
const limits = [
  ["Reads per day", "50,000"],
  ["Writes per day", "20,000"],
  ["Deletes per day", "20,000"],
  ["Stored data", "1 GiB"],
  ["Monthly active users", "50,000"],
];

type ServerUsage = { reads: number; writes: number; since: string };

/** Admin dev page: how much of the free Firestore quota this app is using. */
export function UsagePanel() {
  const [device, setDevice] = useState<{ day: string; counts: UsageCounts }[] | null>(null);
  const [server, setServer] = useState<ServerUsage | null>(null);

  useEffect(() => {
    const days = Array.from({ length: 7 }, (_, i) => todayKey(Date.now() - i * 86_400_000));
    Promise.all(days.map((k) => getMeta<UsageCounts>(k)))
      .then((counts) =>
        setDevice(
          days.map((k, i) => ({ day: k.slice(6), counts: counts[i] ?? { reads: 0, writes: 0 } })),
        ),
      )
      .catch(() => setDevice([]));
    fetch("/api/dev/usage")
      .then((r) => r.json() as Promise<ServerUsage>)
      .then(setServer)
      .catch(() => setServer(null));
  }, []);

  const cell = "border-b border-border px-3 py-2 text-left";
  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-bold">This device&apos;s sync (last 7 days)</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={cell}>Day</th>
                <th className={cell}>Cloud reads</th>
                <th className={cell}>Cloud writes</th>
              </tr>
            </thead>
            <tbody>
              {(device ?? []).map((d) => (
                <tr key={d.day}>
                  <td className={cell}>{d.day}</td>
                  <td className={cell}>{d.counts.reads}</td>
                  <td className={cell}>{d.counts.writes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-bold">Shared lesson library (this server)</h2>
        <p className="mt-2 text-sm text-muted">
          {server
            ? `${server.reads} reads and ${server.writes} writes since ${new Date(server.since).toLocaleString()}.`
            : "Not available."}
        </p>
      </section>
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-bold">Free Spark plan limits (whole project)</h2>
        <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          {limits.map(([name, value]) => (
            <li key={name}>
              {name}: <span className="font-semibold">{value}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">
          Exact project-wide numbers: Firebase console → Firestore Database → Usage tab.
        </p>
      </section>
    </div>
  );
}
