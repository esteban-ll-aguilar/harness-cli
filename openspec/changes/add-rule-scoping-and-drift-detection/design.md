## Context

`syncRules()` in `src/commands/rules.js` writes every enabled rule into AGENTS.md's
"## 13. Project Rules" section uniformly — there's no concept of "this rule only matters
for `src/pages/**`". `checkRules()` only verifies the rule's title string appears in
AGENTS.md; it says nothing about whether the code obeys it. Cursor's `.mdc` rule frontmatter
(`globs:`) and GitHub Spec-Kit / Amazon Kiro's spec/code sync checks both address these
gaps cheaply and are the direct precedent for this change.

## Goals / Non-Goals

**Goals:**
- Let a rule declare it only matters for certain paths, without breaking unglobbed rules.
- Detect the cheapest, deterministic signal of spec/code drift (files touched vs. files
  named in `tasks.md`) with no LLM call.
- Keep the AGENTS.md template aligned with what other AI tools conventionally expect.

**Non-Goals:**
- AST-based or semantic drift detection.
- LLM-as-judge review (separate change).
- Blocking review on drift (WARN only — false positives from legitimately-unlisted
  helper files would make a FAIL here too noisy to trust).
- A general glob engine — rule globs are simple (`src/pages/**`, `**/*.sql`); a ~20-line
  translator covers them.

## Decisions

- **Glob matcher**: `matchGlob(pattern, filePath)` added to `src/utils/fileUtils.js`.
  Translates the pattern to a RegExp (`**` → `.*`, `*` → `[^/]*`, everything else escaped),
  normalizes `\` to `/` first. Zero-dependency constraint rules out `minimatch`/`micromatch`.
- **Rule storage**: `glob` is an OPTIONAL string alongside the existing
  `{id,title,severity,tag,enabled,createdAt}` shape, stored identically in
  `.harnessrc.rules[]` and in the rule's `brain/rules/<id>.md` frontmatter. Omitted = applies
  everywhere (today's behavior, unchanged) — this is what keeps existing `.harnessrc` files
  valid with no migration.
- **CLI**: `harness rules add "<text>" --glob=<pattern>` — parsed alongside
  `--severity`/`--tag` in the existing `parseArgs()`.
- **Scoping is advisory + lookup, not a runtime AGENTS.md filter.** `syncRules()` keeps
  injecting ALL enabled rules into AGENTS.md exactly as today — an AI session isn't scoped
  to one file in advance, so there's nothing to filter against at sync time. The new
  `rulesForFile(rc, filePath)` helper and `harness context --for-file=<path>` are how a human
  or agent *previews* which rules apply before/while editing a specific file. This is a
  deliberate v1 trade-off: it avoids restructuring the ALWAYS-loaded AGENTS.md tier for a
  smaller, safer first step.
- **Drift check**: `extractTaskPaths(tasksMdContent)` regex-extracts backtick-quoted and
  bare relative file paths from `tasks.md`. `diffFilesForSpec(cwd)` shells out to
  `git diff --name-only HEAD` plus `git diff --name-only --staged` (deduped); if the
  project isn't a git repo or `git` isn't on PATH, the check reports
  `WARN "not checkable"` instead of failing. The new Guardian check in `review.js` compares
  the two sets for the target spec (or all active specs if none given) and WARNs with the
  list of unexpected paths. Files under the harness dir itself (`.harness/**`,
  `.harnessrc`) are excluded from the comparison — spec scaffolding (checking off a task,
  editing spec.md) isn't "code the spec touched".

## Risks / Trade-offs

- Path extraction from `tasks.md` is heuristic (regex, not a parser) — it will both miss
  some real references and occasionally over-match. Acceptable because the check is a WARN
  with a hint, never a gate (see Non-Goals).
- "Advisory + lookup" scoping is a smaller win than true per-session filtering of what gets
  loaded into an agent's context; documented here as the deliberate v1 scope so a future
  change can revisit it without re-litigating the decision.
