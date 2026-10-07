import em from "./test-fixtures/catalogue/em.json";
import emSources from "./test-fixtures/catalogue/em-sources.json";
import maths from "./test-fixtures/catalogue/engg-math.json";
import mathsSources from "./test-fixtures/catalogue/engg-math-sources.json";
import { sourceFiles, subjectFiles } from "./src/data/subjects/index.generated";

/*
 * Tests only: two subjects from before the PDEU catalogue (see test-fixtures/catalogue/README.md)
 * join the real catalogue, so the tests and the Gauss's-law sample lesson that use them keep working.
 * Tests of the real catalogue ignore them (they have no PDEU offering).
 */
if (!subjectFiles.some((s) => (s as { id?: string }).id === "em")) {
  // They are tied to one PDEU branch only so that "every subject belongs to a PDEU branch" holds.
  subjectFiles.push({ ...em, branches: ["ce"] }, { ...maths, branches: ["ce"] });
  sourceFiles["em"] = emSources;
  sourceFiles["engg-math"] = mathsSources;
}
