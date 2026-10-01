"use client";

import { useEffect, useState } from "react";
import { KeyIdeaCard } from "@/visuals/KeyIdeaCard";

type ImageInfo = { url: string; page: string; license: string; artist: string };
type CommonsReply = {
  query?: {
    pages?: {
      missing?: boolean;
      imageinfo?: {
        thumburl?: string;
        descriptionurl?: string;
        extmetadata?: Record<string, { value?: string }>;
      }[];
    }[];
  };
};

/** Wikimedia attribution fields can contain HTML; keep only the text. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/** A freely licensed image from Wikimedia Commons, with its licence and author shown. */
export function CommonsImage({
  file,
  alt,
  caption,
}: {
  file: string;
  alt: string;
  caption: string;
}) {
  const [info, setInfo] = useState<ImageInfo | null | "failed">(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      action: "query",
      titles: file,
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      iiurlwidth: "800",
      format: "json",
      formatversion: "2",
      origin: "*",
    });
    fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { signal: controller.signal })
      .then((r) => r.json() as Promise<CommonsReply>)
      .then((data) => {
        const page = data.query?.pages?.[0];
        const image = page?.imageinfo?.[0];
        if (!image?.thumburl || page?.missing) return setInfo("failed");
        const meta = image.extmetadata ?? {};
        setInfo({
          url: image.thumburl,
          page:
            image.descriptionurl ??
            `https://commons.wikimedia.org/wiki/${encodeURIComponent(file)}`,
          license: stripHtml(meta.LicenseShortName?.value ?? "see source"),
          artist: stripHtml(meta.Artist?.value ?? "Wikimedia Commons contributor").slice(0, 80),
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) setInfo("failed");
      });
    return () => controller.abort();
  }, [file]);

  if (info === "failed") return <KeyIdeaCard caption={caption} />;

  return (
    <figure className="flex flex-col gap-2 rounded-xl border border-border bg-surface-2 p-3 sm:p-4">
      {info ? (
        // eslint-disable-next-line @next/next/no-img-element -- external, already-resized Commons thumbnail
        <img
          src={info.url}
          alt={alt}
          loading="lazy"
          className="mx-auto max-h-96 w-auto rounded-lg bg-white"
        />
      ) : (
        <div className="h-48 animate-pulse rounded-lg bg-surface" aria-label="Loading image" />
      )}
      <figcaption className="text-sm text-muted">{caption}</figcaption>
      {info && (
        <p className="text-xs text-muted">
          Image:{" "}
          <a
            href={info.page}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            {info.artist}
          </a>
          , {info.license}, via Wikimedia Commons.
        </p>
      )}
    </figure>
  );
}
