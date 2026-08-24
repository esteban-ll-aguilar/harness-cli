## 1. Memory compaction

- [x] 1.1 Minimal frontmatter parser (`parseFrontmatter(content)`) in
      `src/utils/fileUtils.js` (or `memory.js`): returns `{ meta, body }`
- [x] 1.2 `compactSessionLogs(cwd, harnessDir, { days = 30 })` in `src/commands/memory.js`:
      finds eligible logs, groups by `(event, spec)`, writes
      `memory/session-logs/digest-<from>-<to>.md`, moves originals to
      `.harness/.archive/session-logs/`, rebuilds the BM25 index
- [x] 1.3 Wire `harness memory compact [--days=N]` into the `memory` subcommand switch
- [x] 1.4 Tests: logs older than the threshold get archived + digested; logs newer than
      the threshold are left in place; a second run with nothing eligible reports
      "nothing to compact" (idempotent); archived files are excluded from a fresh
      `buildIndex`

## 2. Symbol index

- [x] 2.1 New `src/utils/symbolIndex.js`: `buildSymbolIndex(cwd)` (regex sets for
      JS/TS, Python, Go, Java, Rust, Dart keyed by extension), `saveSymbolIndex`,
      `loadSymbolIndex` (fingerprint-based rebuild, mirroring `retrieval.js`'s pattern)
- [x] 2.2 `harness memory index` also builds + saves the symbol index
- [x] 2.3 `harness memory symbol <name>` — exact-then-substring lookup, prints
      `file:line (kind)` per match
- [x] 2.4 Tests: finds a JS function/class definition; finds a Python def; substring
      lookup returns partial matches; no-match case reports cleanly

## 3. Guardian self-judge

- [x] 3.1 New `src/commands/judge.js`: `harness judge <specId>` prints the
      self-assessment template (up to 3 enabled `must` rules + diff) with the exact
      `judge-record` invocations
- [x] 3.2 `harness judge record <specId> --rule=<id> --verdict=pass|fail|partial
      --note="..."` appends to `spec.judgeVerdicts[]`
- [x] 3.3 Wire both into `src/cli.js`
- [x] 3.4 New Guardian check in `review.js`: recorded `fail` verdict → FAIL; a rule
      `harness judge` selected with no recorded verdict → WARN "not yet judged"
- [x] 3.5 Tests: judge selects up to 3 must rules; judge-record persists a verdict;
      review FAILs on a recorded fail verdict; review WARNs on an unjudged selected rule;
      review is clean when all selected rules have a `pass` verdict

## 4. MCP exposure

- [x] 4.1 Add `harness_memory_compact`, `harness_memory_symbol`, `harness_judge`,
      `harness_judge_record` tools + arg mapping to `bin/harness-mcp.js`

## 5. Wrap-up

- [x] 5.1 Run the full test suite, confirm 0 regressions
- [x] 5.2 Update README.md (memory compact, symbol lookup, judge workflow)
- [ ] 5.3 Commit — deferred: only commit when the user explicitly asks (project/session policy)
