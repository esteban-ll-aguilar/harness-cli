# 🤖 Harness SDD-BDD-TDD — Multi-Agent Production Framework

> **Agent = Model + Harness.** The model is commodity; the harness is your moat.

A production-grade, AI-agnostic harness for building exceptional software through Specification-Driven, Behavior-Driven, and Test-Driven Development.

**Version:** 1.1.2 | **Status:** Production Ready ✅ | **Tests:** 88/88 passing ✅

## ✨ Features

- **🔍 Auto-Language Detection** — Detects TypeScript, Python, Go, Rust, Java, C#, Ruby, PHP, Swift, Kotlin, Dart/Flutter
- **📦 Monorepo Support** — Scans up to 3 levels deep (skips `node_modules`/build dirs), interactive selection
- **🧠 RAG Memory (BM25)** — Real retrieval over the vault, zero dependencies, `harness memory search`
- **🗂️ Obsidian Vault** — `.harness/` opens as a vault, with auto-generated Map of Content
- **🔌 MCP Server** — `harness-mcp` exposes 20 tools to ANY MCP-compatible agent
- **🤖 Self-Generating Agents** — 6 built-in agents auto-created at init + `harness agent new`
- **📜 `harness rules`** — Project rules synced into AGENTS.md and enforced by the Guardian
- **📌 Spec Lifecycle** — `harness advance` walks each spec through the 6 agents → done
- **📦 Context Bundles** — `harness context` dumps the full optimized prompt for any AI tool
- **6-Agent Workflow**: Interviewer → Architect → Tester → Coder → Reviewer → Guardian
- **AI Agnostic**: Works with Claude, Codex, OpenCode, Kimi, Qwen, DeepSeek, Cursor, Copilot
- **Tiered Memory**: Optimizes token usage without degrading results
- **EARS Notation**: Unambiguous, parseable requirements
- **CI/CD Gates**: Automated quality checks before production
- **Self-Tested**: 88 automated tests covering core functionality

## 🚀 Quick Start

```bash
# Install globally
npm install -g @esteban-ll-aguilar/harness-cli

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

# Manage rules that always apply (init seeds a curated "senior" pack automatically)
harness rules add "Every PR must include a test"
harness rules preset senior   # retrofit the default rule pack on an existing project
harness rules list

# Create your own agent
harness agent new security-auditor

# Dump full context for any AI tool
harness context --spec=001

# Lifecycle gates (work with advance)
harness gate clarify 001              # unresolved ambiguities in spec.md?
harness gate approve 001              # sign off a gated stage (default: architect)
harness judge 001                     # self-assess up to 3 "must" rules against the diff
harness judge record 001 --rule=<id> --verdict=pass

# Coordinate parallel work across specs (no LLM calls from harness-cli itself)
harness orchestrate status
harness orchestrate claim 001

# Symbol lookup + memory upkeep
harness memory symbol getUserByEmail
harness memory compact --days=30
```

## 🔌 AI Tool Selection

`harness init` asks which AI tool(s) you use (multi-select with `␣` / `↑↓` / `Enter`).
Based on your choice it writes the **real config files at the project root** so the
tool actually picks up the harness:

| Tool | Config written |
|---|---|
| Claude Code | `.mcp.json` (harness MCP server) |
| Cursor | `.cursor/mcp.json` |
| OpenCode | `opencode.json` (mcp + instructions) |
| Codex CLI | `.codex/config.toml` |
| Qwen Code | `.qwen/settings.json` (harness MCP server) |
| Kimi Code | manual — `kimi mcp add harness --transport stdio -- harness-mcp` |
| DeepSeek | no auto config (configure MCP in your client) |
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

Exposes 20 tools: `harness_init`, `harness_new_change`, `harness_status`,
`harness_review`, `harness_context` (the automatic entry point — retrieval,
symbol lookup, rules and state in one call), `harness_agent_run`,
`harness_agent_list`, `harness_rules_add`, `harness_rules_preset`,
`harness_advance`, `harness_approve`, `harness_orchestrate_status`,
`harness_orchestrate_claim`, `harness_orchestrate_release`, and more — all
zero-dependency (stdio + JSON-RPC 2.0). Deliberately NOT separate tools
(folded into `harness_context`, or already redundant): `harness_memory_search`,
`harness_memory_symbol`, `harness_rules_list`, `harness_clarify` (`harness_advance`
already runs that check and reports it) — still available as CLI commands for
a human exploring the vault directly.

## 🚀 Quick Start (Alternative)

``` bash
# 1. Descomprime
unzip harness-cli.zip
cd harness-cli

# 2. Empaqueta e instala globalmente
npm pack                    # Genera esteban-ll-aguilar-harness-cli-<version>.tgz
npm install -g ./esteban-ll-aguilar-harness-cli-1.1.0.tgz

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
| `/harness-context` | **The automatic entry point** — bundles rules, BM25 retrieval (`--query=`), symbol lookup (`--symbol=`), and project state in one call. An agent should call this proactively instead of remembering separate search/list commands. |
| `/harness-gate clarify\|approve` | Lifecycle checkpoints for `advance` |
| `/harness-judge` | Self-assess "must" rules against the diff |

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
- **Accent-insensitive**: search is diacritic-normalized (`página` ≟ `pagina`, `código` ≟
  `codigo`) — important since this project's own rules/specs are often written in
  Spanish. Snippets still show the original accented text; only matching is normalized.
- `harness memory stats` shows corpus size; `harness memory index` forces a rebuild
  (also rebuilds the symbol index, below).
- The tiered loader (`tokenOptimizer.js`) uses the same index for ON_DEMAND context.
- **Symbol lookup**: `harness memory symbol <name>` (or `harness context --symbol=<name>`)
  finds where a function/class is defined in your PROJECT's own source (regex-based,
  JS/TS/Python/Go/Java/Rust/Dart — no AST, no vector DB) — a different question than
  the BM25 vault search answers. Falls back to substring matches when there's no exact
  hit. Fingerprinted like the BM25 index — auto-rebuilds when source files change, no
  manual reindex step required.
- **Call-sites ("who uses X")**: an exact symbol match also lists every other place it's
  referenced in the project (a live regex scan, excluding the definition line itself) —
  useful before touching or deleting something. Bundled into the same lookup, not a
  separate command to remember.
- **Memory compaction**: `harness memory compact [--days=N]` (default 30) archives old
  session logs into `.harness/.archive/session-logs/` (kept on disk, never deleted, just
  out of the search index) and writes one grouped digest back — keeps `memory search`
  relevant as a project accumulates history. Idempotent.

### Guardian self-judge

`harness-cli` never calls an LLM itself, so it can't judge rule compliance on its own —
but it can build the judge prompt and enforce the recorded verdict:

- `harness judge <specId>` prints up to 3 enabled "must" rules plus the spec's diff, for
  whichever agent is already in the session to self-assess.
- `harness judge record <specId> --rule=<id> --verdict=pass|fail|partial --note="..."`
  persists the verdict.
- `harness review`'s Guardian enforces it: a recorded `fail` FAILs the gate; a
  judge-selected rule with no recorded verdict at all WARNs "not yet judged" — never
  silently treated as passing.

### Agents

- 6 built-in agents are auto-registered with competency scripts at `harness init`.
- `harness agent new <name> --goal=... --instructions=...` creates custom agents.
- `harness agent run <agent> [specId]` builds a ready-to-paste context prompt.
- `harness agent ensure` regenerates missing scripts.

### Rules

- `harness init` seeds a curated **senior-engineer default rule pack** automatically (13 rules —
  data modeling/normalization, propose-before-build UI/UX, verify functionality end-to-end,
  reuse before creating duplicates, follow existing conventions, propose a plan before big
  changes, don't invent scope, document decisions/learnings, validate boundaries & handle
  errors, avoid N+1/paginate listings, never claim "done" without verifying, self-review before
  handoff, and UI states/accessibility). See `src/data/default-rules.js`.
- Retrofit an existing project (or re-apply after upgrading harness-cli): `harness rules preset senior`.
  Idempotent — already-present rule ids are skipped, so it's safe to re-run.
- Opt out at init time with `harness init --no-default-rules`.
- `harness rules add "Every PR must include a test" --severity=must --tag=testing`
- Rules are synced into `AGENTS.md` (brain + root) and verified by `harness review`.
- **Scoped rules**: `--glob=<pattern>` (e.g. `--glob="src/pages/**"`) limits a rule to
  matching files; omit it for a rule that always applies. Preview what applies to a file
  with `harness context --for-file=<path>`.
- **Guardian drift check**: `harness review` also warns when the working tree touches a
  file that isn't referenced anywhere in the active spec's `tasks.md` — a cheap,
  deterministic heads-up (never a hard gate) that the code may have drifted from what was
  planned.

### Lifecycle

- `harness advance <specId>` walks a spec: interviewer → architect → tester → coder → reviewer → guardian → done
- `harness advance <specId> --to=coder` jumps; `--back` steps backward.

### Clarify gate & approval checkpoints

- **Clarify gate**: `harness advance` blocks the architect→tester transition while the
  spec's `spec.md` still looks ambiguous (no mention of performance, error handling,
  security or scale). Check anytime with `harness gate clarify <specId>`; override with
  `harness advance <specId> --force` (logged as a conscious decision, never silent).
- **Approval checkpoints**: stages listed in `.harnessrc.quality.approvalGates` (default
  `['architect']`) can't be marked done until a human runs
  `harness gate approve <specId> [--stage=<stage>]`. Approving is idempotent — re-approving an
  already-approved stage is a no-op.

### Parallel spec orchestration

`harness-cli` never calls an LLM itself (zero dependencies, AI-client-agnostic by
design) — "automatic parallel agent work" means coordinating **several independent
external agent sessions** (e.g. two Claude Code sessions) working **different specs of
the same project** at once, without colliding:

- `harness orchestrate status` — lists active specs with their stage and claim owner (or "free").
- `harness orchestrate claim <specId> [--owner=<name>]` — reserves a spec. Idempotent for
  the same owner; refuses a fresh claim held by someone else; takes over a stale (>2h) claim.
- `harness orchestrate release <specId>` — frees a claim. Idempotent.
- All `.harnessrc` writes on this path go through a zero-dependency directory-lock
  (`withHarnessRCLock`) so concurrent processes can't corrupt shared state.

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
#   ✅ accent-insensitive: "pagina"/"página" match each other both ways
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
# 📜 Rules Preset
#   ✅ applyPreset seeds the senior rule pack and syncs into AGENTS.md
#   ✅ applyPreset is idempotent — a second call skips already-seeded rules
#   ✅ applyPreset returns an error for an unknown preset name
# 📦 Glob Matching / 📜 Rule Scoping
#   ✅ matchGlob supports **, *, and rule --glob= scoping (harness context --for-file=)
# 🔬 Spec Drift Detection
#   ✅ Guardian warns when code touches files outside the spec's tasks.md
# 🔒 Concurrent Safety / ❓ Ambiguity Detector
#   ✅ withHarnessRCLock serializes concurrent .harnessrc writes, recovers stale locks
#   ✅ detectAmbiguities flags missing performance/error/security/scale coverage
# 🚦 Lifecycle Gating (clarify + approval)
#   ✅ advance blocks architect without approval, tester without clarification
#   ✅ harness gate approve / --force unblock (and log) the override
# 🎛️  Parallel Spec Orchestration
#   ✅ claim/release protocol is idempotent, refuses fresh claims, steals stale ones
# 🗜️  Memory Compaction / 🔎 Symbol Index
#   ✅ archives old logs into a digest, excludes them from the rebuilt BM25 index
#   ✅ finds JS/Python function & class definitions, falls back to substring matches
#   ✅ finds call sites ("who uses X"), excludes the definition line itself
# ⚖️  Guardian Self-Judge
#   ✅ judge selects up to 3 must rules; review FAILs on a recorded fail verdict,
#      WARNs on an unjudged one, PASSes when all are recorded as pass
# 📦 Context (unified automatic entry point)
#   ✅ --symbol= finds a real definition and reports cleanly when nothing matches
# 🧭 CLI Dispatcher (runCLI)
#   ✅ gate/judge/orchestrate routing works end-to-end, not just the underlying functions
#   ✅ help.js's MCP tool count is asserted equal to harness-mcp.js's real TOOLS array
# 🩹 new-change Defensive Fix
#   ✅ initializes activeSpecs when missing from .harnessrc instead of crashing
# Results: 88 passed, 0 failed
```

## 📄 License

MIT
