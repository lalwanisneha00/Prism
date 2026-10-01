"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { skip as skipBy, type TimelineItem } from "@/lib/audio/timeline";

export type PlayerStatus = "idle" | "playing" | "paused" | "waiting" | "ended";

const RATE_KEY = "prism-audio-rate";
const VOICE_KEY = "prism-audio-voice";

function readStorage(key: string): string | null {
  try {
    return typeof window === "undefined" ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage blocked: settings just won't be remembered.
  }
}

/** True when this browser can read text aloud. */
export function speechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window
  );
}

function englishVoices(): SpeechSynthesisVoice[] {
  if (!speechSupported()) return [];
  return speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith("en"))
    .sort((a, b) => Number(b.localService) - Number(a.localService));
}

/**
 * Reads a timeline aloud one sentence at a time with the browser's built-in voice.
 * Speaking sentence by sentence makes highlighting, skipping and resuming exact,
 * and avoids browsers that stop long utterances after ~15 seconds.
 */
export function useSpeechPlayer(timeline: TimelineItem[], complete: boolean, resumeKey: string) {
  const [index, setIndex] = useState(() => Number(readStorage(resumeKey) ?? 0) || 0);
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [rate, setRateState] = useState(() => Number(readStorage(RATE_KEY)) || 1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(englishVoices);
  const [voiceURI, setVoiceURIState] = useState(() => readStorage(VOICE_KEY) ?? "");

  // Each speak() gets a token; events from cancelled utterances carry an old token and are ignored.
  const token = useRef(0);
  // Latest values for the speech callbacks, which fire long after the render that created them.
  const latest = useRef({ index, status, rate, voiceURI, timeline, complete, voices });
  useEffect(() => {
    latest.current = { index, status, rate, voiceURI, timeline, complete, voices };
  });

  useEffect(() => {
    if (!speechSupported()) return;
    const load = () => setVoices(englishVoices());
    speechSynthesis.addEventListener("voiceschanged", load);
    const tokens = token;
    return () => {
      speechSynthesis.removeEventListener("voiceschanged", load);
      tokens.current++;
      speechSynthesis.cancel();
    };
  }, []);

  // Remember the position so the student can resume later.
  useEffect(() => writeStorage(resumeKey, String(index)), [index, resumeKey]);

  const speakRef = useRef<(i: number) => void>(() => {});
  const speak = useCallback((i: number) => {
    const { timeline: tl, rate: r, voiceURI: uri, voices: vs } = latest.current;
    const my = ++token.current;
    speechSynthesis.cancel();
    const item = tl[i];
    if (!item) return;
    const utterance = new SpeechSynthesisUtterance(item.text);
    utterance.rate = r;
    utterance.lang = "en";
    const voice = vs.find((v) => v.voiceURI === uri);
    if (voice) utterance.voice = voice;
    utterance.onend = () => {
      if (my !== token.current) return;
      const next = i + 1;
      const now = latest.current;
      latest.current.index = next;
      if (next < now.timeline.length) {
        setIndex(next);
        speakRef.current(next);
      } else if (!now.complete) {
        setIndex(next);
        setStatus("waiting"); // more chapters are still being written
      } else {
        setStatus("ended");
        setIndex(0);
      }
    };
    utterance.onerror = (e) => {
      if (my !== token.current || e.error === "interrupted" || e.error === "canceled") return;
      setStatus("paused");
    };
    speechSynthesis.speak(utterance);
  }, []);
  useEffect(() => {
    speakRef.current = speak;
  }, [speak]);

  // A chapter arrived while we were waiting for it: carry on reading.
  useEffect(() => {
    if (status !== "waiting" || index >= timeline.length) return;
    const id = setTimeout(() => {
      setStatus("playing");
      speak(index);
    }, 0);
    return () => clearTimeout(id);
  }, [status, index, timeline.length, speak]);

  const play = useCallback(() => {
    if (!speechSupported()) return;
    const { index: i0, timeline: tl } = latest.current;
    const i = i0 >= tl.length ? 0 : i0;
    latest.current.index = i;
    setIndex(i);
    setStatus("playing");
    latest.current.status = "playing";
    speak(i);
  }, [speak]);

  const pause = useCallback(() => {
    token.current++;
    speechSynthesis.cancel();
    setStatus("paused");
    latest.current.status = "paused";
  }, []);

  const seek = useCallback(
    (i: number) => {
      const clamped = Math.max(0, Math.min(i, latest.current.timeline.length - 1));
      latest.current.index = clamped;
      setIndex(clamped);
      if (latest.current.status === "playing") speak(clamped);
    },
    [speak],
  );

  const skip = useCallback(
    (seconds: number) =>
      seek(skipBy(latest.current.timeline, latest.current.index, seconds * latest.current.rate)),
    [seek],
  );

  const setRate = useCallback(
    (r: number) => {
      setRateState(r);
      writeStorage(RATE_KEY, String(r));
      latest.current.rate = r;
      if (latest.current.status === "playing") speak(latest.current.index);
    },
    [speak],
  );

  const setVoice = useCallback(
    (uri: string) => {
      setVoiceURIState(uri);
      writeStorage(VOICE_KEY, uri);
      latest.current.voiceURI = uri;
      if (latest.current.status === "playing") speak(latest.current.index);
    },
    [speak],
  );

  return { index, status, rate, voices, voiceURI, play, pause, seek, skip, setRate, setVoice };
}
