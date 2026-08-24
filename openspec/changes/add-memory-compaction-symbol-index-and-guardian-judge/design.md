## Context

`retrieval.js`'s `buildIndex` walks `brain/`, `specs/`, `memory/` under `.harness/` and
indexes every `.md`/`.feature` file it finds — including every session log ever written.
There is no archival mechanism. Separately, BM25 is purely lexical: it cannot answer
"where is this function defined", which is a different (structural) question than "which
document discusses X". `review.js`'s rule check (`checkRules`) is a text-presence check
only. harness-cli has no LLM integration anywhere in the codebase (confirmed: zero
`dependencies` in package.json, no API client code) — that is a deliberate boundary, not
a gap to close by adding one.

## Goals / Non-Goals

**Goals:**
- Keep `harness memory search` relevant as a project accumulates history, without
  discarding any data.
- Answer "where is X defined" cheaply, without a vector DB or embeddings.
- Make "must" rule compliance a recorded, falsifiable claim instead of a text-presence
  proxy — without harness-cli calling an LLM itself.

**Non-Goals:**
- No LLM calls, no API keys, no new dependencies (unchanged boundary).
- No AST parsing for the symbol index — regex per language, same spirit as
  `languageDetector.js`'s file-signature detection.
- No automatic deletion of old logs.

## Decisions

- **Compaction storage**: archived raw logs move to `.harness/.archive/session-logs/`
  (a NEW top-level dir, sibling to `memory/`, deliberately outside `buildIndex`'s
  `['brain','specs','memory']` roots) — this is what actually reduces search noise,
  as opposed to just moving them to a subfolder still under `memory/`. The digest written
  back to `memory/session-logs/digest-<from>-<to>.md` groups archived entries by
  `(event, spec)` with counts and a date range — built from each log's YAML frontmatter
  (a small hand-rolled parser: split on the first two `---` lines, `key: value` per line,
  matching the frontmatter shape every log writer in this codebase already emits).
  Eligibility: `date` frontmatter (fallback: file mtime) older than `--days` (default 30).
  Idempotent because eligible files no longer exist in `memory/session-logs/` after the
  first run — a second run with the same threshold finds nothing to archive.
- **Symbol index**: `src/utils/symbolIndex.js` exports `buildSymbolIndex(cwd)`, walking
  the PROJECT's own source via `listFiles(cwd)` (already ignores `node_modules` etc. via
  `DEFAULT_IGNORES`), applying one regex set per detected language (JS/TS `function`,
  `class`, `const x = (...) =>`; Python `def`, `class`; Go `func`; Java `class`,
  `interface`; Rust `fn`, `struct`; Dart `class`) matched by file extension. Result:
  `{ symbol: [{file, line, kind}] }`, persisted at `.harness/.index/symbol-index.json`
  (same directory as the BM25 index, same fingerprint-based rebuild-on-change pattern via
  a reused/extended `fingerprint()`). `harness memory index` builds both indexes.
  `harness memory symbol <name>` does an exact-then-substring lookup and prints
  `file:line (kind)` matches. Deliberately a SEPARATE command from `memory search` (not
  merged into one query) — different question, different output shape, easier to test
  and reason about independently.
- **Judge prompt**: `harness judge <specId>` reads `rc.rules` (enabled, severity `must`,
  scoped to the spec's touched files when a `glob` is present — reuses `rulesForFile`
  from the rule-scoping change if that change is applied first; falls back to "all must
  rules" if not), picks up to 3, and the spec's `git diff` (reusing `diffFilesForSpec`
  from the concurrent-safety change when available; a plain `git diff` fallback
  otherwise), and prints a self-assessment template: for each rule, "Does this diff
  satisfy this rule? [pass/fail/partial] — cite the file/line." with the exact
  `harness judge record` invocation to save each answer. This command has NO dependency
  on any specific external agent — it just prints structured text; whichever tool is
  driving (Claude Code, Codex, a human) reads it and calls `judge-record`.
- **Verdict recording & enforcement**: `harness judge record <specId> --rule=<id>
  --verdict=pass|fail|partial --note="..."` appends
  `{ rule, verdict, note, judgedAt, judgedBy }` to
  `.harnessrc.activeSpecs[].judgeVerdicts[]` (mutated via `withHarnessRCLock` if that
  change is applied; direct read-modify-write otherwise — this change does not hard-depend
  on the lock utility existing, it degrades gracefully). `review.js` gains a check: for
  the target spec, any `judgeVerdicts` entry with `verdict: 'fail'` FAILs the Guardian
  (it's a self-admitted violation); any of the 3 rules `harness judge` most recently
  selected that has NO recorded verdict at all WARNs "not yet judged" — never silently
  treated as passing.

## Risks / Trade-offs

- Regex-based symbol extraction will miss some definitions (decorators, unusual
  formatting) and occasionally over-match (a string containing "function foo") —
  acceptable for a "where roughly is X" lookup, not a refactoring tool.
- The judge is only as honest as the agent answering it — harness-cli enforces that a
  verdict was RECORDED and treats a recorded `fail` as a real fail, but cannot verify the
  verdict itself is truthful. This mirrors real code review: the tool enforces process
  (a review happened, feedback was addressed), not omniscient correctness.
- Compaction's frontmatter parser is intentionally minimal (no nested YAML) — sufficient
  because every log this codebase writes uses flat `key: value` frontmatter today.
