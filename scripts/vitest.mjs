// Starts Vitest from an upper-case drive path. On Windows, a terminal opened in "c:\..."
// makes Vite load two copies of Vitest and every test fails with "reading 'config'".
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const upperDrive = (p) => p.replace(/^[a-z]:/, (d) => d.toUpperCase());
process.chdir(upperDrive(process.cwd()));
const cli = join(process.cwd(), "node_modules", "vitest", "vitest.mjs");
process.argv = [process.argv[0], cli, ...process.argv.slice(2)];
await import(pathToFileURL(cli).href);
