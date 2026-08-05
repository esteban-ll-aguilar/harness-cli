# AGENTS_OPENCODE.md — OpenCode Specific Instructions

> This extends AGENTS.md with OpenCode-specific optimizations.
> Read AGENTS.md FIRST, then apply these overrides.

---

## OpenCode Configuration

Config file: `.harness/.opencode/opencode-config.json`

OpenCode is open-source and extensible.

## OpenCode-Specific Optimizations

1. **Custom agents** — Define the 6 harness agents as OpenCode agents
2. **Workflow automation** — Use OpenCode's task system for handoffs
3. **Local models** — Can run with local LLMs for privacy

## OpenCode Integration

```json
{
  "agents": {
    "interviewer": {
      "prompt": "You are the Interviewer agent...",
      "model": "local-llm"
    },
    "architect": {
      "prompt": "You are the Architect agent...",
      "model": "local-llm"
    }
  },
  "workflows": {
    "harness-flow": [
      "interviewer",
      "architect",
      "tester",
      "coder",
      "reviewer",
      "guardian"
    ]
  }
}
```

## Commands

```bash
# Run harness workflow
opencode run harness-flow

# Single agent
opencode agent interviewer --input "user-request.txt"
```
