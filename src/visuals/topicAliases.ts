import aliases from "@/data/visualAliases.json";

/*
 * PDEU's topics are worded differently from the topics Prism's widgets and PhET simulations were
 * built for. visualAliases.json lists, for a PDEU topic that clearly contains an older topic, the
 * older topic id(s), so the same widgets and simulations are still offered. A topic with the old id
 * itself needs no alias.
 */
const table = aliases as Record<string, string[]>;

/** The topic id plus the older topic ids it stands for. */
export function visualTopicIds(topicId: string): string[] {
  return [topicId, ...(table[topicId] ?? [])];
}
