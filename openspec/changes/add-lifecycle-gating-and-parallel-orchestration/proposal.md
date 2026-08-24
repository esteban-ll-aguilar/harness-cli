## Why

`harness advance` documents (in the AGENTS.md template) that the Architect stage "Must:
Get human approval before proceeding" and that ambiguities should be resolved before
planning — but nothing in `advance.js` actually enforces either. The Interviewer already
has an ambiguity detector (`detectAmbiguities` in `interview.js`) that is only ever run
once, during the initial interview, and never re-checked against the approved `spec.md`.
Separately, the user explicitly asked for automatic, parallel, idempotent multi-agent
work. Given harness-cli's own architecture — it is deliberately AI-client-agnostic and
has zero runtime dependencies, so it never calls an LLM itself; the actual agent work
happens in the external tool (Claude Code, Codex, ...) reading AGENTS.md / calling MCP
tools — "parallel automatic agent work" has to mean: make it safe and easy for several
independent external agent sessions to work several independent specs of the SAME
project at the same time, without corrupting shared state or duplicating work. That
requires two things this harness doesn't have yet: safe concurrent writes to
`.harnessrc`, and a claim/release protocol so two sessions don't grab the same spec.

## What Changes

- **Clarify gate**: `detectAmbiguities` is extracted into a reusable checker
  (`src/utils/ambiguityDetector.js`) usable against free text, not just interview answers.
  `harness advance <id>` refuses to mark `tester` done-and-move-on while `architect` just
  completed if the spec's `spec.md` still has unresolved ambiguities (missing
  performance/error-handling/security/scale coverage) — WARN + block, overridable with
  `--force` (logged, same "conscious omission" philosophy the flow already uses for
  skipped stages). New standalone `harness gate clarify <specId>` runs the check on demand.
- **Approval checkpoint**: a stage can require explicit human sign-off
  (`.harnessrc.quality.approvalGates`, default `['architect']`) before the next stage can
  start. New `harness gate approve <specId> [--stage=<stage>]` command, idempotent (approving
  an already-approved stage is a no-op success, not an error).
- **Concurrent safety**: `.harnessrc` read-modify-write becomes atomic via a lightweight,
  zero-dependency directory-based lock (`fs.mkdirSync` as mutex, stale-lock recovery).
  Applied to `advance.js` and the new claim/release commands — the surfaces multiple
  parallel agent sessions actually hit.
- **Parallel spec orchestration**: `harness orchestrate status` lists active specs with
  their stage and claim state; `harness orchestrate claim <specId> [--owner=<name>]` /
  `harness orchestrate release <specId>` let an external agent session reserve a spec so
  a second parallel session working the same project doesn't duplicate its work. Both are
  idempotent (claiming your own already-held claim, or releasing an unclaimed spec, both
  succeed as no-ops). Exposed as MCP tools too, so a Claude Code / Codex session spawning
  sub-agents can dispatch each one at a different, unclaimed spec automatically.

## Capabilities

### New Capabilities
- `clarify-gate`: blocking ambiguity check between Architect and Tester.
- `approval-checkpoint`: explicit human approval required before configured stages advance.
- `concurrent-safety`: atomic `.harnessrc` read-modify-write via a directory lock.
- `parallel-spec-orchestration`: claim/release protocol + status view for running several
  specs of the same project across independent agent sessions safely.

### Modified Capabilities
(none new beyond change 1)

## Impact

- Affected files: `src/commands/advance.js`, `src/commands/interview.js`,
  `src/utils/ambiguityDetector.js` (new), `src/utils/fileUtils.js` (lock helper),
  `src/commands/approve.js` (new), `src/commands/clarify.js` (new),
  `src/commands/orchestrate.js` (new), `src/cli.js`, `bin/harness-mcp.js`,
  `tests/runner.js`.
- Zero new dependencies. `.harnessrc` gains optional fields (`quality.approvalGates`,
  per-spec `approvals`, `claimedBy`/`claimedAt`) — all additive, existing files keep
  working with sane defaults when the fields are absent.

## Non-goals

- harness-cli does NOT call any LLM API itself — "automatic" parallel agent work means
  coordination/safety for external sessions, not in-process model calls. This is a
  deliberate architectural boundary, not an oversight.
- No cross-machine/network locking — the lock is a local filesystem mutex, correct for
  multiple processes on one machine (or a shared filesystem), not a distributed system.
- No UI/dashboard — `orchestrate status` is a CLI/MCP text view only.

## Post-implementation note (2026-08-24)

After building this change and change 3, the user flagged the CLI surface as
having grown confusing (19 top-level commands). `clarify` and `approve` — both
introduced in this change, unpublished — were consolidated into a single
`harness gate` command (`gate clarify`, `gate approve`), matching the existing
`rules`/`memory`/`orchestrate` verb+subcommand pattern. The underlying logic in
`clarify.js`/`approve.js` is untouched; only the CLI entry point changed. All
command examples above reflect the final shape.
