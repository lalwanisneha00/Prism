/*
 * gzip for JSON, using the web-standard CompressionStream (works in browsers and Node).
 * Lessons shrink to roughly a fifth of their size, which keeps Firestore documents small
 * (the limit is 1 MiB) and saves the free storage quota.
 */

export async function gzipJson(value: unknown): Promise<Uint8Array> {
  const stream = new Blob([JSON.stringify(value)])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function gunzipJson(bytes: Uint8Array): Promise<unknown> {
  const copy = new Uint8Array(bytes); // a plain ArrayBuffer-backed copy (Buffers may share memory)
  const stream = new Blob([copy]).stream().pipeThrough(new DecompressionStream("gzip"));
  return JSON.parse(await new Response(stream).text());
}
