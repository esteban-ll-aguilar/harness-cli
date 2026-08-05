# 🤖 Harness SDD-BDD-TDD — Multi-Agent Production Framework

> **Agent = Model + Harness.** The model is commodity; the harness is your moat.

A production-grade, AI-agnostic harness for building exceptional software through Specification-Driven, Behavior-Driven, and Test-Driven Development.

## ✨ Features

- **6-Agent Workflow**:
```
🎙️ Interviewer → 📐 Architect → 🧪 Tester → 💻 Coder → 🔍 Reviewer → 🛡️ Guardian
    (entrevista)    (spec SDD)   (BDD+TDD)   (código)    (revisión)   (CI gates)
```
- **AI Agnostic**: Works with Claude, Codex, OpenCode, Kimi, Qwen, DeepSeek, Cursor, Copilot
- **Tiered Memory**: Optimizes token usage without degrading results
- **Obsidian Vault**: Shared persistent memory across all AI tools
- **EARS Notation**: Unambiguous, parseable requirements
- **CI/CD Gates**: Automated quality checks before production

## 🚀 Quick Start

```bash
# Install globally
npm install -g @harness/sdd-bdd-tdd

# Initialize in your project
cd my-project
harness init

# Start requirement gathering
harness interview

# Create a new feature
harness new-change user-authentication

# Check status
harness status

# Run guardian review
harness review
```

## 🏗️ Architecture

```
.harness/
├── brain/           # Persistent knowledge (git-tracked)
├── memory/          # Session logs (not git-tracked)
├── specs/           # SDD specifications
│   └── NNN-feature/
│       ├── spec.md      # EARS requirements
│       ├── plan.md      # Technical architecture
│       ├── tasks.md     # Atomic tasks
│       ├── features/    # BDD .feature files
│       └── tests/       # TDD test stubs
├── .obsidian/       # Obsidian vault config
├── .claude/         # Claude Code hooks
├── .codex/          # Codex CLI hooks
├── .kimi/           # Kimi config
├── .deepseek/       # DeepSeek config
├── .qwen/           # Qwen config
└── scripts/         # Automation scripts
```

## 🤖 AI Commands

Any AI tool can recognize these commands:

| Command | Description |
|---------|-------------|
| `/harness-new-change <name>` | Create SDD-BDD-TDD feature flow |
| `/harness-status` | Show project health |
| `/harness-review` | Run guardian gates |
| `/harness-interview` | Start requirement gathering |
| `/harness-spec <name>` | Generate spec template |

## 📖 Documentation

- [SDD Guide](docs/sdd.md)
- [BDD Guide](docs/bdd.md)
- [TDD Guide](docs/tdd.md)
- [Agent Handoff Protocol](docs/handoff.md)

## 📄 License

MIT