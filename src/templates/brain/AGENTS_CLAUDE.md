# AGENTS_CLAUDE.md — Claude Code Specific Instructions

> This extends AGENTS.md with Claude Code-specific optimizations.
> Read AGENTS.md FIRST, then apply these overrides.

---

## Claude Code Hooks

Hooks are configured in `.harness/.claude/scripts/`:

### session-start.js
Runs automatically when Claude Code starts a session:
- Loads `brain/AGENTS.md`
- Loads `brain/constitution.md`
- Loads `brain/north-star.md`
- Displays active specs list
- Sets context window priority

### pre-tool-use.js
Runs before any tool execution:
- Validates the action against constitution
- Checks if spec exists for the feature being modified
- Warns if no BDD/TDD artifacts found

## Claude-Specific Optimizations

1. **Use XML tags** for structured output:
   ```xml
   <spec>
     <requirement type="shall">...</requirement>
   </spec>
   ```

2. **Use artifacts** for large outputs (specs, plans)

3. **Thinking mode** for architecture decisions:
   - Always think step-by-step for plan.md
   - Consider 3 alternatives before deciding

4. **Tool use priority:**
   - Read AGENTS.md first (always)
   - Read spec.md before coding
   - Read tests/ before implementing
   - Write memory log after each phase

## Claude Code Commands

```bash
# Start with harness context
claude --context .harness/brain/AGENTS.md

# Review a spec
claude "review spec specs/001-auth/spec.md"

# Run guardian checks
claude "run harness review"
```

## Memory Management

Claude Code has large context. Use it wisely:
- Load full spec directory when working on a feature
- Keep constitution always loaded
- Use `memory/session-logs/` for persistence between sessions
