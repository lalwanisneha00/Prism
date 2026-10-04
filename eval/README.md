# eval

Accuracy measurement (SPEC §6.1, §12.3). Each subject's golden set (`golden/<subject>.json`) lists topics with key facts a correct lesson must state; `npm run eval` generates lessons with the real pipeline and scores them.

## Commands

| Command                                  | What it does                                                                  |
| ---------------------------------------- | ----------------------------------------------------------------------------- |
| `npm run eval`                           | Every subject with a golden set (needs `GEMINI_API_KEY`)                      |
| `npm run eval -- --subject=em`           | One subject                                                                   |
| `npm run eval -- --max-topics=10`        | At most 10 new topics this run (spread a subject over several days)           |
| `npm run eval -- --fresh`                | Ignore saved progress                                                         |
| `npm run eval -- --fake`                 | Dry run with the fake AI (checks the harness, no quota)                       |
| `npm run golden:check [-- --subject=em]` | Checks every fact's source quote is on its page; prints 3 samples per subject |

## Resuming (SPEC §12.7)

Each topic's result is saved in `results/progress/<subject>-<level>-<duration>-<prompt>.json` as soon as it is done; a rerun skips finished topics. On a rate limit the runner waits 30 s, 60 s, 2 min, then 4 min; if the quota is still used up it saves and exits with code 2 ("run again later"). A subject's score is recorded in `EVAL_LOG.md` and `src/data/accuracy.json` only when all its topics are done.

## Golden facts and their sources

Facts must come from fetched trusted text, never from a model's memory (SPEC §12.3 rule 4). Each fact can carry `"source": { "url": "...", "quote": "exact words on that page" }`; `golden:check` fetches the page (cached in `cache/sources/`) and fails if the quote isn't there.

A subject can only be recommended for `tested` (≥ 85%) or `verified` (≥ 95%) when its golden set has at least 12 topics and every fact has a checked quote. The runner records the recommended tier in `src/data/accuracy.json`; a person reviews three sample entries before a subject's tier is changed. The E&M and Engineering Maths sets were written before quotes existed, so they stay `sourced` until their facts are quoted.
