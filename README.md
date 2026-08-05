# 🤖 Harness SDD-BDD-TDD — Multi-Agent Production Framework

> **Agent = Model + Harness.** The model is commodity; the harness is your moat.

A production-grade, AI-agnostic harness for building exceptional software through Specification-Driven, Behavior-Driven, and Test-Driven Development.

**Version:** 1.0.0 | **Status:** Production Ready ✅ | **Tests:** 12/12 passing ✅

## ✨ Features

- **🔍 Auto-Language Detection** — Detects TypeScript, Python, Go, Rust, Java, C#, Ruby, PHP, Swift, Kotlin, Dart/Flutter
- **📦 Monorepo Support** — Scans up to 3 levels deep, detects multiple languages, interactive selection
- **6-Agent Workflow**: Interviewer → Architect → Tester → Coder → Reviewer → Guardian
- **AI Agnostic**: Works with Claude, Codex, OpenCode, Kimi, Qwen, DeepSeek, Cursor, Copilot
- **Tiered Memory**: Optimizes token usage without degrading results
- **Obsidian Vault**: Shared persistent memory across all AI tools
- **EARS Notation**: Unambiguous, parseable requirements
- **CI/CD Gates**: Automated quality checks before production
- **Robust Error Handling**: Graceful failures with cleanup
- **Self-Tested**: 12 automated tests covering all core functionality

## 🚀 Quick Start

```bash
# Install globally
npm install -g @harness/sdd-bdd-tdd

# Initialize in your project (auto-detects language!)
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

## 🚀 Quick Start (Alternative)

``` bash
# 1. Descomprime
unzip harness-cli.zip
cd harness-cli

# 2. Empaqueta e instala globalmente
npm pack                    # Genera harness-sdd-bdd-tdd-1.0.0.tgz
npm install -g ./harness-sdd-bdd-tdd-1.0.0.tgz

# 3. Inicializa en tu proyecto
cd tu-proyecto
harness init

# 4. Empieza a usar
harness interview           # 🎙️ Entrevista interactiva
harness new-change auth     # 📐 Nuevo flujo SDD-BDD-TDD
harness status              # 📊 Estado del proyecto
harness review              # 🛡️ Guardian gates
```


## 📦 Monorepo Support

Harness scans your entire project tree (up to 3 levels deep) and detects ALL languages:

```bash
cd my-monorepo
harness init
# 🔍 Monorepo detected! 3 languages found:
#   1. TypeScript (confidence: 25) 📁 root
#   2. Python (confidence: 15) 📂 sub
#   3. Dart (confidence: 12) 📂 sub
# Select primary language for this harness (number): 1

# Create features in different languages:
harness new-change frontend-auth           # Uses TypeScript (primary)
harness new-change backend-api --lang=go   # Uses Go
harness new-change mobile-login --lang=dart # Uses Dart
```

## 🔍 Auto-Language Detection

| Language | Detected By | Test Framework | BDD Framework |
|----------|-------------|----------------|---------------|
| **TypeScript** | `tsconfig.json`, `package.json` | Vitest | Cucumber.js |
| **JavaScript** | `package.json` | Jest | Cucumber.js |
| **Python** | `pyproject.toml`, `requirements.txt` | pytest | pytest-bdd |
| **Go** | `go.mod` | testing | godog |
| **Rust** | `Cargo.toml` | built-in | cucumber-rs |
| **Java** | `pom.xml`, `build.gradle` | JUnit 5 | Cucumber JVM |
| **C#** | `.csproj`, `.sln` | xUnit | SpecFlow |
| **Ruby** | `Gemfile` | RSpec | Cucumber |
| **PHP** | `composer.json` | PHPUnit | Behat |
| **Swift** | `Package.swift` | XCTest | XCTest + Gherkin |
| **Kotlin** | `build.gradle.kts` | JUnit 5 | Cucumber JVM |
| **Dart** | `pubspec.yaml` | package:test | package:gherkin |

## 🏗️ Architecture

```
.harness/
├── brain/           # Persistent knowledge (git-tracked)
│   ├── AGENTS.md              # Universal AI instructions
│   ├── AGENTS_CLAUDE.md       # Claude Code specific
│   ├── AGENTS_CODEX.md        # Codex CLI specific
│   ├── AGENTS_KIMI.md         # Kimi specific
│   ├── AGENTS_DEEPSEEK.md     # DeepSeek specific
│   ├── AGENTS_QWEN.md         # Qwen specific
│   ├── AGENTS_OPENCODE.md     # OpenCode specific
│   ├── constitution.md        # Immutable project rules
│   ├── north-star.md          # Vision & goals
│   ├── decisions/             # ADRs
│   ├── patterns/              # Architecture patterns
│   ├── competencies/          # Agent scripts
│   └── people/                # Stakeholder profiles
├── memory/          # Session logs (NOT git-tracked)
│   └── session-logs/          # Per-session transcripts
├── specs/           # SDD Specifications
│   └── NNN-feature/
│       ├── spec.md      # EARS requirements
│       ├── plan.md      # Technical architecture
│       ├── tasks.md     # Atomic tasks
│       ├── features/    # BDD .feature files
│       ├── tests/       # TDD test stubs (language-specific!)
│       └── docs/        # Additional docs
├── tests/           # Global test utilities
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .obsidian/       # Obsidian vault config
├── .claude/         # Claude Code hooks
├── .codex/          # Codex CLI hooks
├── .kimi/           # Kimi config
├── .deepseek/       # DeepSeek config
├── .qwen/           # Qwen config
├── .vscode/         # VS Code settings
├── .github/         # GitHub Actions CI
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

- [SDD Guide](docs/sdd.md) — Specification-Driven Development
- [BDD Guide](docs/bdd.md) — Behavior-Driven Development
- [TDD Guide](docs/tdd.md) — Test-Driven Development
- [Agent Handoff Protocol](docs/handoff.md) — How agents pass work

## 🔄 The 6-Agent Workflow

```
🎙️ Interviewer → 📐 Architect → 🧪 Tester → 💻 Coder → 🔍 Reviewer → 🛡️ Guardian
   (entrevista)     (spec SDD)    (BDD+TDD)   (código)    (revisión)   (CI gates)
```

Each agent has:
- **Specific role** and responsibilities
- **Input artifacts** from previous agent
- **Output artifacts** for next agent
- **Handoff protocol** for context transfer

## 🧠 Memory & Context

### Tiered Loading (Token Optimization)

| Tier | Content | Tokens | When |
|------|---------|--------|------|
| **ALWAYS** | AGENTS.md + constitution.md + north-star.md | ~500 | Every session |
| **ON_DEMAND** | Search brain/ for relevant context | Variable | When needed |
| **TRIGGER** | Load spec.md when file changes | ~200 | After tool use |
| **RARE** | Full vault scan | Variable | Explicit request |

## 🛡️ Error Handling

- **Graceful failures** with descriptive messages
- **Automatic cleanup** on init failure
- **Validation** of all inputs (language, spec names, etc.)
- **Try/catch** on all file operations
- **Stack traces** in development, clean messages in production

## 🧪 Testing

```bash
npm test
# 🧪 Running Harness CLI Tests
# 📦 Language Detector
#   ✅ detects TypeScript from tsconfig.json
#   ✅ detects Python from requirements.txt
#   ✅ detects Go from go.mod
#   ✅ detects Dart from pubspec.yaml
#   ✅ detects monorepo with multiple languages
#   ✅ getLanguageConfig returns correct config
#   ✅ getLanguageConfig falls back to TypeScript for unknown
# 📦 File Utils
#   ✅ slugify converts to kebab-case
#   ✅ slugify handles special characters
#   ✅ timestamp returns valid format
#   ✅ nextSpecId returns 001 for empty project
#   ✅ nextSpecId increments correctly
# Results: 12 passed, 0 failed
```

## 📄 License

MIT
