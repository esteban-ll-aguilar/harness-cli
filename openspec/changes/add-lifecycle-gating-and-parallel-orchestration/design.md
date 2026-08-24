## Context

`advance.js`'s `step()` is a small state machine over `spec.agents[stage] ∈
{undefined, 'done', 'omitted'}`, persisted in `.harnessrc.activeSpecs[]` via
`loadHarnessRC`/`writeHarnessRC` (plain `fs.readFileSync`/`writeFileSync`, no locking —
a race between two concurrent callers can silently drop one writer's change). The
Interviewer's `detectAmbiguities` already exists but is single-use. The AGENTS.md
template already documents a human-approval requirement for the Architect stage that
nothing enforces today. harness-cli has zero runtime dependencies and never calls an
LLM API — the 6 "agents" are prompt/context bundles (`harness agent run <name>`) an
external AI tool executes; harness-cli's job is state, gates, and coordination.

## Goals / Non-Goals

**Goals:**
- Make the documented-but-unenforced approval and ambiguity-resolution expectations real.
- Make `.harnessrc` mutation safe under concurrent access from multiple processes.
- Give N external agent sessions a safe, idempotent way to divide up N independent specs
  of the same project without colliding.

**Non-Goals:**
- No in-process LLM calls — stays strictly AI-client-agnostic (see proposal Non-goals).
- No distributed/networked locking.
- No change to the single-spec stage sequence itself (still strictly sequential within
  one spec) — parallelism is only ACROSS specs.

## Decisions

- **Ambiguity checker extraction**: move the keyword-heuristic body of
  `detectAmbiguities` from `interview.js` into `src/utils/ambiguityDetector.js` as
  `detectAmbiguities(text)` (plain string in, same 4 heuristics: performance, error
  handling, security, scale). `interview.js` calls it with
  `JSON.stringify(answers).toLowerCase()` as before (behavior-preserving refactor).
  `advance.js`/`clarify.js` call it with the spec.md file content.
- **Clarify gate placement**: checked in `step()` at the exact transition where
  `architect` is already `done` and the next stage to mark `done` is `tester` (i.e. right
  before `agents['tester'] = 'done'` would be set). If `detectAmbiguities(spec.md text)`
  returns any findings, block: print them + "Fix spec.md or override with --force", do
  NOT mutate state. `--force` proceeds and logs an `ambiguity-override` entry (same
  append-only session-log pattern as `logOmission`). New `harness gate clarify <specId>`
  command runs the same checker standalone (no state change), for use anytime.
- **Approval gate storage**: `.harnessrc.quality.approvalGates` (array of stage names,
  default `['architect']` when absent — set as a default in `init.js`'s written
  `.harnessrc`, but ALSO defaulted at read-time in `advance.js`/`approve.js` via
  `rc.quality?.approvalGates || ['architect']` so pre-existing `.harnessrc` files without
  the key behave identically to a fresh one). Per-spec approval state:
  `spec.approvals = { <stage>: { approvedAt, approvedBy } }`. `step()` blocks marking a
  gated stage `done` (i.e. moving past it) until `spec.approvals[stage]` exists — actually
  the gate belongs on the stage that requires sign-off itself: once `architect` would be
  set to `done`, instead check `approvalGates.includes('architect')`; if so, require
  `spec.approvals.architect` to already exist (set via `harness gate approve <id>
  --stage=architect`, run BEFORE the advance) — if missing, block with
  "Approve first: harness gate approve <id> --stage=architect". `harness gate approve` itself
  doesn't move the stage forward; it only records approval, keeping "approve" and
  "advance" as two explicit, separately-auditable actions.
- **Idempotency of `approve`**: re-running `harness gate approve <id> --stage=architect`
  after it's already approved prints "already approved (at <timestamp>)" and exits 0 — no
  duplicate log entries, no error.
- **Lock primitive**: `withHarnessRCLock(cwd, mutatorFn)` in `fileUtils.js`. Acquires
  `<cwd>/.harnessrc.lock/` via `fs.mkdirSync` (fails with `EEXIST` if held — this is
  atomic on any POSIX/NTFS filesystem, no dependency needed). Retries every 50ms up to a
  2s budget; if the lock dir's `mtime` is older than 10s when a retry fails, treats it as
  stale (a crashed process left it behind) and force-removes it once before retrying.
  On success: loads `.harnessrc`, calls `mutatorFn(rc)` (mutates `rc` in place — its
  return value is passed through to the caller as metadata, e.g. `{ alreadyApproved:
  true }`, and is never itself written, so a caller can't accidentally clobber
  `.harnessrc` with a status object), writes the mutated `rc` back, then
  `fs.rmdirSync`s the lock dir in a `finally`.
  Throws a clear error after the retry budget is exhausted (caller decides how to surface
  it — advance.js prints "🔒 Project busy, try again" rather than a raw stack trace).
- **Adoption scope for the lock**: `advance.js` (`step`, `jumpTo`, `completeSpec`) and the
  new `orchestrate.js`/`approve.js` commands adopt it now, since these are the surfaces
  multiple parallel agent sessions actually hit. Other commands keep their existing
  direct `loadHarnessRC`/`writeHarnessRC` calls for this change (documented as a Non-goal
  extension point, not a regression — they were never concurrency-safe and aren't made
  worse).
- **Claim protocol**: per-spec `claimedBy` (string) + `claimedAt` (ISO timestamp) in
  `.harnessrc.activeSpecs[]`, mutated through `withHarnessRCLock`. `harness orchestrate
  claim <specId> [--owner=<name>]` (owner defaults to `` `${os.hostname()}:${process.pid}`
  ``, still zero-dependency since `os` is a Node built-in): if unclaimed → claim
  (success); if claimed by the same owner → no-op success (idempotent retry-safe); if
  claimed by someone else AND `claimedAt` is within a 2-hour staleness window → refuse
  with who holds it and since when; if stale (>2h) → steal the claim (logged) since the
  original claimant is presumed dead. `harness orchestrate release <specId>`: clears the
  fields if owned by the caller (or always, if no `--owner` check is requested) — releasing
  an already-unclaimed spec is a no-op success. `harness orchestrate status` prints every
  active spec's id, stage, claim owner (or "free"), so an orchestrating session can pick
  N unclaimed specs and dispatch N sub-agent sessions at them.

## Risks / Trade-offs

- The lock is coarse-grained (whole `.harnessrc`, not per-spec) — acceptable because
  writes are small and infrequent (a `harness advance` call, not a hot loop); finer-grained
  locking would add complexity disproportionate to the actual contention this tool sees.
- 2-hour claim staleness is a heuristic, not a heartbeat — a still-alive session that's
  simply slow could have its claim stolen. Documented, not solved, in this change; a
  future change could add an explicit `harness orchestrate renew <specId>` heartbeat.
- Extending `detectAmbiguities` to run over `spec.md` free text reuses the exact same
  keyword heuristic as the interview check, so it inherits its known false-negative rate
  (a spec that happens to use a synonym the checker doesn't know slips through) — accepted
  since it's a WARN-and-block-with-override, not a silent gate.
