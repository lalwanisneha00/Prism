import data from "@/data/labs/virtualLabs.json";
import { hits, normal } from "@/lib/labs/text";

/*
 * A free Virtual Labs (vlab.co.in) simulation for an experiment, from our checked list
 * (src/data/labs/virtualLabs.json). Never a guessed link: no match means no link.
 */

export type VirtualLab = { title: string; url: string; lab: string };

export function virtualLabFor(experiment: { name: string; aim?: string }): VirtualLab | undefined {
  const text = normal(`${experiment.name} ${experiment.aim ?? ""}`);
  let best: { lab: VirtualLab; score: number } | undefined;
  for (const entry of data.labs) {
    // Longer matching phrases say more ("axis of a circular coil" beats "transformer").
    const score = entry.keywords
      .filter((k) => hits(text, k))
      .reduce((sum, k) => sum + k.split(" ").length, 0);
    if (score > 0 && (!best || score > best.score))
      best = { lab: { title: entry.title, url: entry.url, lab: entry.lab }, score };
  }
  return best?.lab;
}
