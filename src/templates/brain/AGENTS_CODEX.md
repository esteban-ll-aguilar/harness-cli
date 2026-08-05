# AGENTS_CODEX.md — Codex CLI Specific Instructions

> This extends AGENTS.md with Codex CLI-specific optimizations.
> Read AGENTS.md FIRST, then apply these overrides.

---

## Codex CLI Hooks

Configured in `.harness/.codex/hooks.json`:

```json
{
  "session_start": "cat .harness/brain/AGENTS.md .harness/brain/constitution.md",
  "pre_tool_use": "node .harness/.claude/scripts/validate.js",
  "post_file_write": "node .harness/scripts/validate-spec.sh"
}
```

## Codex-Specific Optimizations

1. **Use JSON mode** for structured specs when possible
2. **Prefer file writes** over inline code for specs >50 lines
3. **Use `codex -a` (agent mode)** for multi-step workflows
4. **Token budget:** Codex is fast but smaller context
   - Load ONLY the active spec + constitution
   - Use `tokenOptimizer.js` tier: ALWAYS + ON_DEMAND

## Codex CLI Commands

```bash
# Initialize with harness
codex --instructions .harness/brain/AGENTS.md

# Work on a spec
codex "implement tasks from specs/001-auth/tasks.md"

# Run tests
codex "run tests for spec 001-auth"
```

## Rate Limiting

Codex CLI may have rate limits. Batch small tasks:
- Group related tasks in tasks.md
- Use batch mode for test generation
