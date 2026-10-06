# Performance report

Measured on a production build, 375px phone, CPU slowed 4x, slow 4G (1.6 Mbps, 150 ms), by `scripts/perf.cjs`.
Raw numbers: `perf/before.json`, `perf/after2.json`. "content" = ms until the page's main content shows.

| Page                           | JS before        | JS after           | Content before    | Content after     |
| ------------------------------ | ---------------- | ------------------ | ----------------- | ----------------- |
| Subjects                       | 595 KB           | 590 KB             | 5339 ms           | 3498 ms           |
| Dashboard                      | 623 KB           | 453 KB             | 5192 ms           | 3822 ms           |
| Planner                        | 607 KB           | 613 KB             | 5406 ms           | 3845 ms           |
| Library                        | 632 KB           | 642 KB             | 4845 ms           | 3312 ms           |
| Uploads                        | 609 KB           | 616 KB             | 5006 ms           | 3490 ms           |
| Lesson (sample)                | 1087 KB          | 1104 KB            | 11123 ms          | 9273 ms           |
| Concept map                    | 175 KB*          | 922 KB             | 1281 ms*          | 5566 ms           |
| Home / Subject page / Accuracy | 94 / 178 / 93 KB | 286 / 358 / 162 KB | 1.6 / 1.7 / 0.9 s | 1.7 / 1.6 / 1.3 s |

Clicks (ms): home→Subjects 527→450, Subjects→subject 106→122, →Dashboard 696→589, →Library 113→121, →Concept map 924→1781.

\*The old map number did not wait for the graph to draw, so it is not comparable. The new number is the real one.

## Causes found and fixed

- Firebase SDK (~179 KB gz) loaded on every page: now loaded after the page is idle.
- All 84 subjects were validated with Zod in the browser on every page: skipped in the browser (a test proves the data is identical).
- Widgets, charts, audio, worksheet, concept map and print sheet load only when a lesson uses them.
- Instant click feedback: navigation bar, pressed states, route loading skeleton.
- A light subject index (42 KB instead of ~950 KB) and per-subject loaders exist; the map and the new Subjects page use them.

## Not met (honest)

- Targets (click under 300 ms, content under 1 s) are NOT met on this throttled test. Most pages are still 3-4 s, the lesson page 9 s, the concept map 5.5 s.
- Still heavy: `@/lib/subjects` (all subject data + Zod) is imported by about 68 files. Moving list-only pages to the light index is the next step.
- The concept map's graph code is large; it needs its own split.
- Home/Subject pages grew in JS (shared chunk changes). Needs a look.
