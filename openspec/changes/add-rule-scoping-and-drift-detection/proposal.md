## Why

Rules today are flat (severity + tag only) and get injected into every agent session
regardless of which file is being touched. Comparable tools (Cursor's `.mdc` rules with
`globs:` frontmatter) scope a rule to the files it actually matters for. Separately,
`harness rules check` / `harness review` only verify that a rule's TEXT is present in
AGENTS.md — never whether the code that was written actually respects the spec that was
approved. GitHub Spec-Kit and Amazon Kiro both flag this "living-spec drift" as a core
differentiator. Both gaps are cheap, additive fixes that don't touch the 6-agent state
machine, so they ship first.

## What Changes

- Rules gain an optional `glob` field (e.g. `src/pages/**`, `**/*.sql`). `harness rules
  add --glob=...` persists it; a new `rulesForFile()` lookup and `harness context
  --file=<path>` expose which rules apply to a given path. Rules without a glob keep
  applying everywhere (default, unchanged) — fully backward compatible with existing
  `.harnessrc` rule entries.
- `harness review [specId]` gains a Guardian check that diffs the working tree
  (`git diff --name-only`) against the file paths referenced in the spec's `tasks.md`
  and WARNs (never FAILs) on files touched outside that set.
- `src/templates/brain/AGENTS.md` (the template copied into every user project) gets
  explicit build/test/lint command placeholders and a PR/commit convention line, matching
  what the wider AGENTS.md ecosystem (Claude Code, Codex, Cursor, Copilot, Gemini CLI,
  Amazon Q) expects to find there.

## Capabilities

### New Capabilities
- `rule-scoping`: optional glob-based scoping for project rules, with a lookup helper.
- `spec-drift-detection`: a Guardian check flagging code changes outside a spec's tasks.md.

### Modified Capabilities
(none — first OpenSpec-tracked change in this repo)

## Impact

- Affected files: `src/commands/rules.js`, `src/commands/review.js`,
  `src/commands/context.js`, `src/utils/fileUtils.js`,
  `src/templates/brain/AGENTS.md`, `tests/runner.js`.
- Zero new dependencies. No breaking `.harnessrc` schema change (`glob` is optional).

## Non-goals

- No AST/semantic drift detection — only a deterministic file-path comparison.
- No LLM-as-judge (tracked in a later change).
- Drift detection never blocks the review (WARN only) — false positives would be common.
- No general-purpose glob engine — a minimal `*`/`**`/literal matcher is enough.
