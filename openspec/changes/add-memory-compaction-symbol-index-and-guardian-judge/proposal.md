## Why

`memory/session-logs/` grows without bound and is indexed in full by BM25 — a long-lived
project accumulates hundreds of stage/omission logs that dilute `harness memory search`
relevance ("context rot"). Retrieval is also purely lexical (BM25 over Markdown text);
there's no way to ask "where is `getUserByEmail` defined" without a full-text guess.
Finally, `harness review`'s rule check only verifies rule TEXT is present in AGENTS.md,
never whether the code actually honors a "must" rule — closing that gap properly needs
LLM reasoning, which harness-cli cannot provide itself (zero dependencies, no API calls,
AI-client-agnostic by design — see the previous change's Non-goals). The right hybrid,
consistent with that boundary: harness-cli deterministically crafts a self-assessment
prompt and a place to record/enforce the verdict; the actual judging happens in the
external agent session that's already there.

## What Changes

- `harness memory compact [--days=N]` (default 30): archives session-logs older than N
  days into `.harness/.archive/session-logs/` (kept on disk, out of the indexed roots)
  and writes one compact digest Markdown file back into `memory/session-logs/`
  (grouped by event + spec, counts and date range only — no LLM, purely structural).
  Idempotent: re-running with nothing eligible reports "nothing to compact".
- A lightweight, regex-based symbol index (`function`/`class`/`def`/... per detected
  language) over the PROJECT's own source (not the `.harness` vault) is built alongside
  the BM25 index and queryable via `harness memory symbol <name>`.
- `harness judge <specId>` builds a deterministic self-assessment prompt (up to 3 "must"
  rules + the spec's `git diff`) for the calling agent to answer; `harness judge record
  <specId> --rule=<id> --verdict=pass|fail|partial --note="..."` persists the verdict.
  `harness review` gains a check: a recorded `fail` verdict FAILs the gate; an unjudged
  selected rule WARNs (never silently ignored, never fabricated).

## Capabilities

### New Capabilities
- `memory-compaction`: archive old session-logs into a compact digest.
- `symbol-index`: regex-based definition index over the project's own source.
- `guardian-self-judge`: deterministic judge-prompt generation + verdict recording,
  enforced (fail on recorded failure, warn on missing) by the Guardian.

### Modified Capabilities
(none)

## Impact

- Affected files: `src/commands/memory.js`, `src/utils/retrieval.js`,
  `src/utils/symbolIndex.js` (new), `src/commands/judge.js` (new),
  `src/commands/review.js`, `src/cli.js`, `bin/harness-mcp.js`, `tests/runner.js`.
- Zero new dependencies. `.harnessrc` gains an optional per-spec `judgeVerdicts[]` array
  (additive).

## Non-goals

- No LLM API calls from harness-cli itself (same boundary as the previous change).
- No vector embeddings / external search service for the symbol index — regex-based,
  same zero-dependency constraint as the rest of the tool.
- Compaction never deletes data — originals are archived on disk, not removed.

## Post-implementation note (2026-08-24)

`judge-record` (introduced in this change, unpublished) was folded into
`judge` as a subcommand (`harness judge record ...`) during a CLI-surface
simplification pass — see the sibling note in
`add-lifecycle-gating-and-parallel-orchestration/proposal.md`. Logic in
`judge.js` is untouched; only the CLI entry point changed.
