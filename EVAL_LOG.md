# Eval log

Every full `npm run eval` run (SPEC §6.1 rule 6). A verified subject must stay at or above 95%.

Notes:

- 2026-10-03 run 1 (rows above, dated in UTC): baseline before the "core content" prompt rule. Its scorer did not yet read Unicode maths (ε₀A/d, x²), so a few facts written that way were wrongly counted as missing; lesson texts were not saved, so it cannot be re-scored.
- From run 2 on: prompt 2026-10-03.3 adds the level-independent "core content" rule; the scorer reads Unicode maths; every lesson's text is saved in eval/results/lessons/ so each missed fact can be checked by hand.

- Run 2 (prompt .3) hand review: each missed fact was checked against the saved lesson. Scorer fixes made after it (all logged here): LaTeX formatting commands (\mathbf, \boldsymbol, \text and similar) are ignored; patterns accept textbook-equivalent forms (I = nqAu, S = E × H, "stored directly in the field", ε₀·A/d with the fraction after ε₀, Euler's theorem with degree k and scale s). Re-scored offline with those fixes, run 2 is em 84.9% and engg-math 80.8%. The remaining misses were real gaps (e.g. power factor never said cos φ; the EM-wave lesson omitted c = 1/√(μ₀ε₀)).
- Run 3 (prompt .4): the fact-check pass also lists core textbook facts the lesson never states, and they are added to the revision sheet (only if they typeset).

- Run 3 (prompt .4) result: em 79.8% (one lesson failed: invalid JSON after 3 tries, counted as 0), engg-math 88.5%. The free Gemini quota ran out during the run (42 rate-limit messages): five topics took ~450 s and their fact-check, including the new completeness pass, never ran ("sourced 0/n"). Where it ran it worked (the power-factor lesson gained "power factor = cos(φ)"). After allowing brackets in the cos φ pattern, run 3 re-scores at em 83.2% and engg-math 88.5%.
- Status: neither subject has passed the 95% gate yet, so both stay "sourced". Next: re-run once the daily quota resets (so every topic gets its fact-check), then look at the remaining real gaps (e.g. the line/sheet results in Gauss's-law applications, X_L = X_C at resonance).

| Date       | Subject               | Level · length           | Topics | Key facts             | Valid lessons | Visuals (issues) | Prompt       | Model                             |
| ---------- | --------------------- | ------------------------ | ------ | --------------------- | ------------- | ---------------- | ------------ | --------------------------------- |
| 2026-10-02 | em                    | first-encounter · 10 min | 40     | **71.4%** (119 facts) | 40/40         | 55 (0)           | 2026-10-03.2 | gemini-flash-latest (+ fallbacks) |
| 2026-10-02 | engg-math             | first-encounter · 10 min | 18     | **78.8%** (52 facts)  | 18/18         | 26 (0)           | 2026-10-03.2 | gemini-flash-latest (+ fallbacks) |
| 2026-10-03 | em                    | first-encounter · 10 min | 40     | **79.8%** (119 facts) | 40/40         | 51 (0)           | 2026-10-03.3 | gemini-flash-latest (+ fallbacks) |
| 2026-10-03 | engg-math             | first-encounter · 10 min | 18     | **76.9%** (52 facts)  | 18/18         | 21 (0)           | 2026-10-03.3 | gemini-flash-latest (+ fallbacks) |
| 2026-10-03 | em                    | first-encounter · 10 min | 40     | **79.8%** (119 facts) | 39/40         | 60 (0)           | 2026-10-03.4 | gemini-flash-latest (+ fallbacks) |
| 2026-10-03 | engg-math             | first-encounter · 10 min | 18     | **88.5%** (52 facts)  | 18/18         | 27 (0)           | 2026-10-03.4 | gemini-flash-latest (+ fallbacks) |
| 2026-10-04 | applied-physics       | first-encounter · 10 min | 16     | **97.2%** (36 facts)  | 16/16         | 22 (0)           | 2026-10-03.4 | gemini-flash-latest (+ fallbacks) |
| 2026-10-04 | engg-chemistry        | first-encounter · 10 min | 15     | **97.2%** (36 facts)  | 15/15         | 31 (0)           | 2026-10-03.4 | gemini-flash-latest (+ fallbacks) |
| 2026-10-04 | basic-electrical      | first-encounter · 10 min | 13     | **88.5%** (26 facts)  | 12/13         | 25 (0)           | 2026-10-03.4 | gemini-flash-latest (+ fallbacks) |
| 2026-10-04 | basic-electronics     | first-encounter · 10 min | 13     | **96.6%** (29 facts)  | 13/13         | 23 (0)           | 2026-10-03.4 | gemini-flash-latest (+ fallbacks) |
| 2026-10-04 | engg-mechanics        | first-encounter · 10 min | 13     | **83.3%** (24 facts)  | 11/13         | 21 (0)           | 2026-10-03.4 | gemini-flash-latest (+ fallbacks) |
| 2026-10-04 | engg-mechanics        | first-encounter · 10 min | 13     | **100%** (24 facts)   | 13/13         | 21 (0)           | 2026-10-03.4 | gemini-flash-latest (+ fallbacks) |
| 2026-10-04 | engg-graphics         | first-encounter · 10 min | 13     | **84.6%** (26 facts)  | 12/13         | 17 (0)           | 2026-10-03.4 | gemini-flash-latest (+ fallbacks) |
| 2026-10-04 | pps                   | first-encounter · 10 min | 13     | **100%** (30 facts)   | 13/13         | 25 (0)           | 2026-10-03.4 | gemini-flash-latest (+ fallbacks) |
| 2026-10-04 | environmental-science | first-encounter · 10 min | 12     | **96%** (25 facts)    | 12/12         | 33 (1)           | 2026-10-03.4 | gemini-flash-latest (+ fallbacks) |
| 2026-10-04 | engg-graphics         | first-encounter · 10 min | 13     | **92.3%** (26 facts)  | 13/13         | 19 (0)           | 2026-10-03.4 | gemini-flash-latest (+ fallbacks) |
| 2026-10-04 | basic-electrical      | first-encounter · 10 min | 13     | **96.2%** (26 facts)  | 13/13         | 27 (0)           | 2026-10-03.4 | gemini-flash-latest (+ fallbacks) |

**2026-10-04, Wave 1 notes (V3 · Step 7):** Engineering Mechanics was re-run (`--fresh`) after a pipeline fix: two lessons had failed only because a visual never became valid; the final attempt now drops such a visual instead of failing the whole lesson. Engineering Graphics (1 lesson: invalid JSON three times) and Basic Electrical (1 lesson) had their failed lessons regenerated once with `--retry-failed`; lessons that generated but missed facts were never re-run. Remaining misses: standing-waves "half-wavelength spacing", nanomaterials "1–100 nm", BJT "emitter most heavily doped", first/third-angle projection (2 facts), energy pyramid "upright". A sourced chart in the deforestation lesson showed a number not in its source; such charts are now repaired or removed during generation.
| 2026-10-04 | dsa | first-encounter · 10 min | 14 | **86.2%** (29 facts) | 12/14 | 21 (0) | 2026-10-03.4 | gemini-flash-latest (+ fallbacks) |
| 2026-10-04 | dsa | first-encounter · 10 min | 14 | **100%** (29 facts) | 14/14 | 25 (0) | 2026-10-03.4 | gemini-flash-latest (+ fallbacks) |
| 2026-10-04 | discrete-maths | first-encounter · 10 min | 13 | **91.7%** (24 facts) | 13/13 | 11 (0) | 2026-10-03.4 | gemini-flash-latest (+ fallbacks) |
| 2026-10-04 | discrete-maths | first-encounter · 10 min | 13 | **100%** (24 facts) | 13/13 | 11 (0) | 2026-10-03.4 | gemini-flash-latest (+ fallbacks) |
| 2026-10-04 | coa | first-encounter · 10 min | 12 | **100%** (23 facts) | 12/12 | 18 (0) | 2026-10-03.4 | gemini-flash-latest (+ fallbacks) |
| 2026-10-04 | operating-systems | first-encounter · 10 min | 12 | **100%** (23 facts) | 12/12 | 24 (0) | 2026-10-03.4 | gemini-flash-latest (+ fallbacks) |
| 2026-10-04 | dbms | first-encounter · 10 min | 12 | **91.3%** (23 facts) | 12/12 | 20 (0) | 2026-10-03.4 | gemini-flash-latest (+ fallbacks) |
| 2026-10-04 | computer-networks | first-encounter · 10 min | 12 | **79.2%** (24 facts) | 11/12 | 20 (0) | 2026-10-03.4 | gemini-flash-latest (+ fallbacks) |
| 2026-10-04 | computer-networks | first-encounter · 10 min | 12 | **91.7%** (24 facts) | 12/12 | 21 (0) | 2026-10-03.4 | gemini-flash-latest (+ fallbacks) |
| 2026-10-04 | theory-of-computation | first-encounter · 10 min | 12 | **95.5%** (22 facts) | 12/12 | 20 (0) | 2026-10-03.4 | gemini-flash-latest (+ fallbacks) |
| 2026-10-04 | oop | first-encounter · 10 min | 12 | **85.7%** (21 facts) | 12/12 | 14 (0) | 2026-10-03.4 | gemini-flash-latest (+ fallbacks) |
| 2026-10-04 | compiler-design | first-encounter · 10 min | 12 | **68.2%** (22 facts) | 9/12 | 19 (0) | 2026-10-03.4 | gemini-flash-latest (+ fallbacks) |
| 2026-10-04 | compiler-design | first-encounter · 10 min | 12 | **68.2%** (22 facts) | 9/12 | 19 (0) | 2026-10-03.4 | gemini-flash-latest (+ fallbacks) |
| 2026-10-04 | compiler-design | first-encounter · 10 min | 12 | **95.5%** (22 facts) | 12/12 | 25 (0) | 2026-10-03.4 | gemini-flash-latest (+ fallbacks) |
