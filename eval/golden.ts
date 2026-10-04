import { readdirSync, readFileSync } from "node:fs";
import { GoldenSchema, type Golden } from "./score";

/** Every golden set in eval/golden/ (one JSON file per subject), checked against the schema. */
export function loadGoldenSets(dir = "eval/golden"): Golden[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => {
      const parsed = GoldenSchema.safeParse(JSON.parse(readFileSync(`${dir}/${f}`, "utf8")));
      if (!parsed.success) throw new Error(`eval/golden/${f}: ${parsed.error.issues[0]?.message}`);
      return parsed.data;
    });
}
