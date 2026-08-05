# AGENTS_KIMI.md — Kimi Specific Instructions

> This extends AGENTS.md with Kimi-specific optimizations.
> Read AGENTS.md FIRST, then apply these overrides.

---

## Kimi Configuration

Config file: `.harness/.kimi/kimi-config.json`

Kimi supports long context (200K+ tokens). Leverage this:
- Load FULL spec directory including features/ and tests/
- Load brain/ patterns/ for architectural context
- Use Kimi's search capability for on-demand memory

## Kimi-Specific Optimizations

1. **Use markdown heavily** — Kimi excels at structured markdown
2. **Leverage long context** — Load multiple specs for cross-cutting concerns
3. **Use Kimi plugins** — If available, connect to Obsidian vault
4. **Chinese/Spanish support** — Kimi is multilingual; specs can be in user's language

## Kimi Commands

```bash
# Start session with harness
kimi --config .harness/.kimi/kimi-config.json

# Generate spec from interview
kimi "read memory/interview-xxx.md and generate spec.md"

# Review code
kimi "review src/ against specs/001-auth/spec.md"
```

## Moonshot API Integration

If using Moonshot API directly:
- Set `MOONSHOT_API_KEY`
- Use `system` prompt with AGENTS.md content
- Set `temperature: 0.2` for spec generation (precision)
- Set `temperature: 0.7` for creative problem solving
