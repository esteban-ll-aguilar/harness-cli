# AGENTS_QWEN.md — Qwen Specific Instructions

> This extends AGENTS.md with Qwen-specific optimizations.
> Read AGENTS.md FIRST, then apply these overrides.

---

## Qwen Configuration

Config file: `.harness/.qwen/qwen-config.json`

Qwen is strong at code and multilingual tasks.

## Qwen-Specific Optimizations

1. **Code-first approach** — Qwen generates clean code; use for Coder agent
2. **Multilingual specs** — Write specs in Spanish/Chinese if needed
3. **Tool use** — Qwen supports function calling for automated workflows

## Qwen Commands

```bash
# Generate code from spec
qwen "implement specs/001-auth/spec.md with TDD"

# Generate tests
qwen "write BDD features for specs/001-auth/"
```

## API Settings

```json
{
  "model": "qwen-coder-plus",
  "temperature": 0.2,
  "max_tokens": 8192
}
```
