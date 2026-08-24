## 1. Concurrent safety (foundation — do first, everything else depends on it)

- [x] 1.1 Add `withHarnessRCLock(cwd, mutatorFn)` to `src/utils/fileUtils.js`
      (`fs.mkdirSync` mutex, 50ms retry up to 2s, stale-lock (>10s) force-recovery,
      `finally` release)
- [x] 1.2 Tests: two sequential lock acquisitions both succeed; a held lock blocks a
      second acquisition until released; a stale lock dir (old mtime) is recovered

## 2. Clarify gate

- [x] 2.1 Extract `detectAmbiguities(text)` from `interview.js` into
      `src/utils/ambiguityDetector.js`; `interview.js` calls it with
      `JSON.stringify(answers).toLowerCase()` (behavior-preserving)
- [x] 2.2 New `src/commands/clarify.js`: `harness gate clarify <specId>` reads `spec.md`,
      runs the checker, prints findings (or "no obvious ambiguities")
- [x] 2.3 Wire `clarify` into `src/cli.js`
- [x] 2.4 In `advance.js` `step()`: when about to mark `tester` done right after
      `architect` is done, run the checker against `spec.md`; block (no state mutation)
      and print findings + override hint unless `--force` is passed
- [x] 2.5 `--force` path: proceed and log an `ambiguity-override` session-log entry
- [x] 2.6 Tests: clarify command reports findings for a thin spec.md; advance blocks
      without `--force` when ambiguities exist; advance proceeds and logs with `--force`;
      advance proceeds normally when spec.md has no detected ambiguities

## 3. Approval checkpoint

- [x] 3.1 New `src/commands/approve.js`: `harness gate approve <specId> [--stage=<stage>]`
      (stage defaults to the highest-completed gated stage); reads/writes
      `spec.approvals` via `withHarnessRCLock`
- [x] 3.2 Wire `approve` into `src/cli.js`
- [x] 3.3 In `advance.js` `step()`: before marking a stage in
      `rc.quality?.approvalGates || ['architect']` as `done`, require
      `spec.approvals[stage]` to exist; block with a clear "approve first" message if not
- [x] 3.4 Idempotency: re-approving an already-approved stage prints "already approved"
      and exits 0 without a duplicate log entry
- [x] 3.5 `init.js`: set `quality.approvalGates: ['architect']` as an explicit default
      in newly-written `.harnessrc` (read-time default in advance.js/approve.js still
      covers pre-existing projects without the key)
- [x] 3.6 Tests: advance blocks past architect without approval; `harness gate approve`
      unblocks it; approving twice is idempotent (no duplicate log, exit 0 both times)

## 4. Parallel spec orchestration

- [x] 4.1 New `src/commands/orchestrate.js` with `status`, `claim <specId>
      [--owner=<name>]`, `release <specId> [--owner=<name>]` subcommands, all mutating
      through `withHarnessRCLock`
- [x] 4.2 Wire `orchestrate` into `src/cli.js`
- [x] 4.3 Claim logic: unclaimed → claim; claimed by same owner → no-op success;
      claimed by another owner within 2h → refuse with holder + timestamp; claimed but
      stale (>2h) → steal (log the steal)
- [x] 4.4 Release logic: clears claim fields; releasing an unclaimed spec is a no-op
      success
- [x] 4.5 `status` output: id, name, current stage, claim owner or "free"
- [x] 4.6 Tests: claim on a free spec succeeds; re-claiming your own claim is a no-op;
      claiming someone else's fresh claim is refused; claiming a stale (>2h, simulate via
      injected `claimedAt`) claim succeeds and logs a steal; release is idempotent

## 5. MCP exposure

- [x] 5.1 Add `harness_clarify`, `harness_approve`, `harness_orchestrate_status`,
      `harness_orchestrate_claim`, `harness_orchestrate_release` tools + arg mapping to
      `bin/harness-mcp.js`, following the existing TOOLS/TOOL_NAME_TO_COMMAND pattern

## 6. Wrap-up

- [x] 6.1 Run the full test suite, confirm 0 regressions
- [x] 6.2 Update README.md (new commands, `--force`, approval gates, orchestrate claim
      protocol, and the explicit "harness-cli never calls an LLM itself" architecture note)
- [ ] 6.3 Commit — deferred: only commit when the user explicitly asks (project/session policy)
