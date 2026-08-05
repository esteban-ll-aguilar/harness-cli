# AGENTS_DEEPSEEK.md — DeepSeek Specific Instructions

> This extends AGENTS.md with DeepSeek-specific optimizations.
> Read AGENTS.md FIRST, then apply these overrides.

---

## DeepSeek Configuration

Config file: `.harness/.deepseek/deepseek-config.json`

DeepSeek excels at reasoning. Use it for:
- Architecture decisions (plan.md)
- Complex algorithm design
- Security analysis (Guardian agent)

## DeepSeek-Specific Optimizations

1. **Use reasoning mode** for architecture and planning
2. **Code generation** is strong; use for Coder agent tasks
3. **Smaller context** than Claude — be selective
   - Load: constitution + active spec ONLY
   - Use file references instead of inline content

## DeepSeek Commands

```bash
# Reason about architecture
deepseek "analyze specs/001-auth/spec.md and propose 3 architectures"

# Generate implementation
deepseek "implement task 3 from specs/001-auth/tasks.md"

# Security review
deepseek "security audit src/auth/ against OWASP top 10"
```

## API Settings

```json
{
  "model": "deepseek-coder",
  "temperature": 0.1,
  "max_tokens": 4096,
  "top_p": 0.95
}
```
