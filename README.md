# 🤖 Harness SDD-BDD-TDD — Multi-Agent Production Framework

> **Agent = Model + Harness.** The model is commodity; the harness is your moat.

A production-grade, AI-agnostic harness for building exceptional software through Specification-Driven, Behavior-Driven, and Test-Driven Development.

**Version:** 1.1.0 | **Status:** Production Ready ✅ | **Tests:** 19/19 passing ✅

## ✨ Features

- **🔍 Auto-Language Detection** — Detects TypeScript, Python, Go, Rust, Java, C#, Ruby, PHP, Swift, Kotlin, Dart/Flutter
- **📦 Monorepo Support** — Scans up to 3 levels deep (skips `node_modules`/build dirs), interactive selection
- **🧠 RAG Memory (BM25)** — Real retrieval over the vault, zero dependencies, `harness memory search`
- **🗂️ Obsidian Vault** — `.harness/` opens as a vault, with auto-generated Map of Content
- **🔌 MCP Server** — `harness-mcp` exposes 13 tools to ANY MCP-compatible agent
- **🤖 Self-Generating Agents** — 6 built-in agents auto-created at init + `harness agent new`
- **📜 `harness rules`** — Project rules synced into AGENTS.md and enforced by the Guardian
- **📌 Spec Lifecycle** — `harness advance` walks each spec through the 6 agents → done
- **📦 Context Bundles** — `harness context` dumps the full optimized prompt for any AI tool
- **6-Agent Workflow**: Interviewer → Architect → Tester → Coder → Reviewer → Guardian
- **AI Agnostic**: Works with Claude, Codex, OpenCode, Kimi, Qwen, DeepSeek, Cursor, Copilot
- **Tiered Memory**: Optimizes token usage without degrading results
- **EARS Notation**: Unambiguous, parseable requirements
- **CI/CD Gates**: Automated quality checks before production
- **Self-Tested**: 19 automated tests covering core functionality

## 🚀 Quick Start

```bash
# Install globally
npm install -g @harness/cli

# Initialize in your project (auto-detects language!)
cd my-project
harness init        # interactive: pick your AI tools (␣ toggle, Enter confirm)
harness init --auto # skip prompts, enable everything
harness init --tools=claude,opencode # only the tools you use

# Start requirement gathering
harness interview

# Create a new feature
harness new-change user-authentication

# Check status
harness status

# Run guardian review (now executes the real tests!)
harness review

# Advance a spec through the 6-agent lifecycle
harness advance 001

# Actually run a spec's tests (real pass/fail, no fake gates)
harness test 001
harness test 001 --cmd="npm test"   # wire your own runner
harness test 001 --skip             # record an explicit "not applicable" decision

# Semantic search over the vault (RAG)
harness memory search "auth token rate limiting"

# Manage rules that always apply
harness rules add "Every PR must include a test"
harness rules list

# Create your own agent
harness agent new security-auditor

# Dump full context for any AI tool
harness context --spec=001
```

## 🔌 AI Tool Selection

`harness init` asks which AI tool(s) you use (multi-select with `␣` / `↑↓` / `Enter`).
Based on your choice it writes the **real config files at the project root** so the
tool actually picks up the harness:

| Tool | Config written |
|---|---|
| Claude Code / Cursor / Kimi / Qwen / DeepSeek | `.mcp.json` (harness MCP server) |
| OpenCode | `opencode.json` (mcp + instructions) |
| Codex CLI | `.codex/config.toml` |
| Cursor | `.cursor/mcp.json` |
| Copilot | `AGENTS.md` (root, already created) |

Non-interactive: `harness init --auto` (all tools) or `harness init --tools=claude,opencode`.

## 🔌 MCP Server (any AI tool)

Wire the harness into Claude Code, Codex, OpenCode, Cursor, Windsurf… as an MCP server:

```json
{
  "mcpServers": {
    "harness": {
      "command": "harness-mcp"
    }
  }
}
```

Exposes 13 tools: `harness_init`, `harness_new_change`, `harness_status`,
`harness_review`, `harness_context`, `harness_memory_search`,
`harness_agent_run`, `harness_agent_list`, `harness_rules_add`,
`harness_rules_list`, `harness_advance`, and more — all zero-dependency
(stdio + JSON-RPC 2.0).

## 🚀 Quick Start (Alternative)

``` bash
# 1. Descomprime
unzip harness-cli.zip
cd harness-cli

# 2. Empaqueta e instala globalmente
npm pack                    # Genera harness-sdd-bdd-tdd-1.0.0.tgz
npm install -g ./harness-cli-1.1.0.tgz

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
│   ├── AGENTS_<TOOL>.md       # Per-tool instructions
│   ├── constitution.md        # Immutable project rules
│   ├── north-star.md          # Vision & goals
│   ├── rules/                 # Project rules (harness rules)
│   ├── decisions/             # ADRs
│   ├── patterns/              # Architecture patterns
│   ├── competencies/          # Agent scripts (auto-generated)
│   └── people/                # Stakeholder profiles
├── memory/         # Session logs + Obsidian MOC (NOT git-tracked)
│   ├── session-logs/
│   └── obsidian/MOC.md
├── specs/           # SDD Specifications
│   └── NNN-feature/
│       ├── spec.md      # EARS requirements
│       ├── plan.md      # Technical architecture
│       ├── tasks.md     # Atomic tasks
│       ├── features/    # BDD .feature files
│       ├── tests/       # TDD test stubs (language-specific!)
│       └── docs/        # Additional docs
├── .index/          # BM25 retrieval index (derived, gitignored)
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
├── .opencode/       # OpenCode config + MCP
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
| `/harness-advance <id>` | Move a spec to the next agent stage |
| `/harness-memory <query>` | Semantic search over the vault |
| `/harness-rules` | Show rules that always apply |
| `/harness-context` | Full optimized context bundle |

> Prefer the MCP server for a native experience: `harness-mcp`.

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

The harness memory is Markdown in `brain/`, `specs/` and `memory/`. Open `.harness/`
as an **Obsidian vault** (a Map of Content is auto-generated in `memory/obsidian/MOC.md`).

### Tiered Loading (Token Optimization)

| Tier | Content | Tokens | When |
|------|---------|--------|------|
| **ALWAYS** | AGENTS.md + constitution.md + north-star.md | ~500 | Every session |
| **ON_DEMAND** | BM25 retrieval over the vault | Variable | `harness memory search "<q>"` |
| **TRIGGER** | Load spec.md when file changes | ~200 | After tool use |
| **RARE** | Full vault scan | Variable | Explicit request |

### Retrieval (RAG)

- Zero-dependency BM25 (Okapi) index in `.harness/.index/`, rebuilt automatically when files change.
- `harness memory search "auth token"` returns ranked docs with snippets.
- `harness memory stats` shows corpus size; `harness memory index` forces a rebuild.
- The tiered loader (`tokenOptimizer.js`) uses the same index for ON_DEMAND context.

### Agents

- 6 built-in agents are auto-registered with competency scripts at `harness init`.
- `harness agent new <name> --goal=... --instructions=...` creates custom agents.
- `harness agent run <agent> [specId]` builds a ready-to-paste context prompt.
- `harness agent ensure` regenerates missing scripts.

### Rules

- `harness rules add "Every PR must include a test" --severity=must --tag=testing`
- Rules are synced into `AGENTS.md` (brain + root) and verified by `harness review`.

### Lifecycle

- `harness advance <specId>` walks a spec: interviewer → architect → tester → coder → reviewer → guardian → done
- `harness advance <specId> --to=coder` jumps; `--back` steps backward.

### Flow integrity & conscious omission

The flow is followed **by default**, but skipping is allowed when it makes sense
(e.g. no interview needed, tests not applicable). The difference from a silent
backdoor: every skipped stage is marked **`⏭️ omitted`** and **logged** in
`memory/session-logs/` with a timestamp and target, so the decision is auditable.
`done` means "an agent actually did it"; `omitted` means "explicitly skipped".

- `advance 001 --to=coder` → interviewer stays `done`, the rest become `omitted` + log.
- `advance` then skips omitted stages automatically.

### Real TDD gate (no fake gates)

`harness review` and `harness test <specId>` **execute** the spec's tests instead
of just checking that a test file exists:

- Auto-detects the language runner (`npm test`, `pytest`, `go test`, `cargo test`, …).
- Parses Jest / Vitest / pytest / Go / Cargo output for real pass/fail counts.
- `harness test <id> --cmd="npm test"` wires a custom runner (runs from the spec dir).
- If the framework isn't installed it reports **WARN "not runnable"** — never a fake pass.
- `--skip` / `--skip-tests` records an explicit "tests not applicable" omission in the logs.

`harness review` also checks that BDD features contain **real** Gherkin scenarios
(no `[bracketed]` template placeholders) and, when the tester stage completes,
`harness advance` prompts to complete them interactively.
- `harness status` shows per-agent state; completed specs move to `.harnessrc.completedSpecs`.

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
#   ✅ does not detect Python inside node_modules
# 📦 File Utils
#   ✅ slugify converts to kebab-case
#   ✅ slugify handles special characters
#   ✅ timestamp returns valid format
#   ✅ nextSpecId returns 001 for empty project
#   ✅ nextSpecId increments correctly
# 📦 Retrieval (BM25 RAG)
#   ✅ tokenize strips markdown noise and stopwords
#   ✅ buildIndex + search ranks the relevant document first
#   ✅ index fingerprint changes when a file changes
# 📦 AI Adapter
#   ✅ getToolConfig does not crash on non-JSON hook scripts
#   ✅ getToolConfig parses valid JSON configs
# 📦 Spec Lifecycle
#   ✅ advance STAGES follow the 6-agent workflow
# 🔌 Tool Setup
#   ✅ parseToolsFlag filters to known tool ids
#   ✅ writeToolConfigs writes real per-tool config files
# 🧪 Test Runner
#   ✅ parseOutput parses Jest/pytest/cargo/go summaries
# 🐛 BDD Gate
#   ✅ countBddScenarios separates real from placeholder scenarios
# Results: 29 passed, 0 failed
```

## 📄 License

MIT
