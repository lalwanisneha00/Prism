"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/account/AuthProvider";
import { deviceProfile } from "@/components/flags/flagApi";
import type { VideoReply } from "@/lib/labs/labVideos";
import type { Video } from "@/lib/labs/youtube";

/** "12:05" or "1:02:03". */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

type State = { kind: "loading" } | { kind: "error" } | VideoReply;

function VideoCard({
  video,
  subject,
  topic,
  onReplaced,
}: {
  video: Video;
  subject: string;
  topic: string;
  onReplaced: (videos: Video[]) => void;
}) {
  const { user, signIn } = useAuth();
  const [playing, setPlaying] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function report() {
    if (!user) {
      setNote("Sign in so your report can be counted (one per student).");
      return;
    }
    setNote("Sending…");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/labs/videos", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject, topic, videoId: video.id, profile: await deviceProfile() }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: true; counted: boolean; hidden: boolean; videos: Video[] }
        | { ok: false; message: string }
        | null;
      if (!data) return setNote("Prism could not be reached. Try again.");
      if (!data.ok) return setNote(data.message);
      if (data.hidden) {
        onReplaced(data.videos);
        return;
      }
      setNote(
        data.counted
          ? "Thanks! When enough students report it, it is replaced."
          : "You already reported this video.",
      );
    } catch {
      setNote("You seem to be offline. Try again later.");
    }
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3">
      {playing ? (
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1`}
            title={video.title}
            className="h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="relative block aspect-video w-full overflow-hidden rounded-lg bg-surface-2"
          aria-label={`Play ${video.title}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- a YouTube thumbnail, shown as is */}
          <img
            src={`https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
          <span className="absolute right-2 bottom-2 rounded bg-black/80 px-1.5 py-0.5 font-mono text-xs text-white">
            {formatDuration(video.duration)}
          </span>
        </button>
      )}
      <a
        href={`https://www.youtube.com/watch?v=${video.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold hover:underline"
      >
        {video.title}
      </a>
      <p className="text-sm text-muted">
        {video.channel}
        {video.trusted ? " · trusted channel" : ""} · {formatDuration(video.duration)}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void report()}
          className="text-sm font-semibold text-muted underline hover:text-fg"
        >
          Video doesn&apos;t match this experiment
        </button>
        {note && !user && note.startsWith("Sign in") && (
          <button
            type="button"
            onClick={() => void signIn()}
            className="text-sm font-semibold text-primary underline"
          >
            Sign in
          </button>
        )}
      </div>
      {note && (
        <p className="text-sm text-muted" aria-live="polite">
          {note}
        </p>
      )}
    </li>
  );
}

/** Up to three demonstration videos found on YouTube for this experiment (never written by the AI). */
export function LabVideos({ subject, topic }: { subject: string; topic: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  useEffect(() => {
    let alive = true;
    fetch(`/api/labs/videos?${new URLSearchParams({ subject, topic })}`)
      .then((r) => r.json() as Promise<VideoReply>)
      .then((reply) => alive && setState(reply))
      .catch(() => alive && setState({ kind: "error" }));
    return () => {
      alive = false;
    };
  }, [subject, topic]);

  if ("kind" in state && state.kind === "loading")
    return (
      <div className="h-40 animate-pulse rounded-xl bg-surface-2" aria-busy="true" role="status" />
    );
  if ("kind" in state || state.status === "unavailable" || state.status === "not-found")
    return (
      <p className="text-sm text-muted">Videos could not be loaded right now. Try again later.</p>
    );
  if (state.status === "no-key")
    return (
      <p className="text-sm text-muted" data-testid="videos-off">
        Demonstration videos are not switched on yet.
      </p>
    );
  if (state.videos.length === 0)
    return <p className="text-sm text-muted">No good video was found for this experiment yet.</p>;
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="lab-videos">
      {state.videos.map((v) => (
        <VideoCard
          key={v.id}
          video={v}
          subject={subject}
          topic={topic}
          onReplaced={(videos) => setState({ status: "ok", videos })}
        />
      ))}
    </ul>
  );
}
