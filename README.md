# 🤖 Harness SDD-BDD-TDD — Multi-Agent Production Framework

> **Agent = Model + Harness.** The model is commodity; the harness is your moat.

A production-grade, AI-agnostic harness for building exceptional software through Specification-Driven, Behavior-Driven, and Test-Driven Development.

**Version:** 1.3.2 | **Status:** Release candidate verified | **Tests:** 118/118 passing ✅

## ✨ Features

- **🔍 Auto-Language Detection** — Detects TypeScript, Python, Go, Rust, Java, C#, Ruby, PHP, Swift, Kotlin, Dart/Flutter
- **📦 Monorepo Support** — Scans up to 3 levels deep (skips `node_modules`/build dirs), interactive selection
- **🧠 Hybrid Long-Term Memory** — BM25 + provenance graph + local semantic vectors; all agents use the same bounded retrieval through `harness context`
- **🗂️ Obsidian Vault** — `.harness/` opens as a vault, with auto-generated Map of Content
- **🔌 MCP Server** — `harness-mcp` exposes 8 composite tools to any MCP-compatible agent
- **🤖 Specialized agents** — 10 built-in roles, including backend, frontend, security and a single-writer Memory Steward
- **📜 `harness rules`** — Project rules synced into AGENTS.md and enforced by the Guardian
- **📌 Spec Lifecycle** — `harness advance` walks each spec through the 6 agents → done
- **📦 Context Bundles** — `harness context` dumps the full optimized prompt for any AI tool
- **6-Agent Workflow**: Interviewer → Architect → Tester → Coder → Reviewer → Guardian
- **AI Agnostic**: Works with Claude, Codex, OpenCode, Kimi, Qwen, DeepSeek, Cursor, Copilot
- **Tiered Memory**: Optimizes token usage without degrading results
- **EARS Notation**: Unambiguous, parseable requirements
- **CI/CD Gates**: Automated quality checks before production
- **Self-Tested**: 118 automated tests covering workflow gates, adversarial traceability and memory fallbacks

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

# Mandatory work preflight: restores the workflow after normal conversation
harness work start 001 --task=2

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

# Local semantic long-term memory (provisioned automatically by harness init)
harness memory semantic status
harness memory semantic search "authentication credentials"

# Evidence that CI can parse
harness quality report --json
```

### Native local-inference scripts

The semantic-memory runtime includes `onnxruntime-node` and `protobufjs`. Their `postinstall`
scripts prepare the native ONNX runtime used to create embeddings locally. Some npm setups block
all install scripts by default and show an `npm warn install-scripts` warning. It is a security
policy notice, not a harness error.

If you trust this package and want local semantic memory, allow **only** those two scripts for
this install:

```bash
# Installing a locally built release artifact
npm install -g ./esteban-ll-aguilar-harness-cli-1.3.2.tgz \
  --allow-scripts=onnxruntime-node,protobufjs

# Or installing the published package
npm install -g @esteban-ll-aguilar/harness-cli \
  --allow-scripts=onnxruntime-node,protobufjs
```

Do not enable scripts globally unless that is an explicit policy decision for your machine.
Without native inference, the harness remains usable and reports semantic memory as degraded;
BM25 plus the provenance graph continue to provide deterministic retrieval.

`harness init` downloads the pinned embedding model once and stores it locally under
`.harness/.models/embeddings/`. Every AI tool uses the same semantic index through
`harness context`; no API key, Docker daemon, cloud vector database, Ollama, or per-agent
setup is required. Markdown remains the versionable source of truth; model files and vector
indexes are rebuildable and ignored by Git.

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

Exposes 8 composite tools: `harness_init`, `harness_new_change`, `harness_status`,
`harness_context`, `harness_agent_run`, `harness_advance`, `harness_review`, and
`harness_test`. The context tool is the automatic entry point for bounded retrieval,
rules and project state. The lower-level CLI commands remain available for humans,
but agents do not need to memorize a large MCP surface.

## 🚀 Quick Start (Alternative)

``` bash
# 1. Descomprime
unzip harness-cli.zip
cd harness-cli

# 2. Empaqueta e instala globalmente
npm pack                    # Genera esteban-ll-aguilar-harness-cli-<version>.tgz
npm install -g ./esteban-ll-aguilar-harness-cli-1.3.2.tgz \
  --allow-scripts=onnxruntime-node,protobufjs

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
│   └── semantic/     # Local embedding vectors (derived, gitignored)
├── .models/          # ONNX embedding model provisioned by init (derived, gitignored)
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

### Preventing workflow drift

Conversation can stay natural; enforcement starts when work starts. `harness work start <spec>`
prints the non-skippable implementation checklist and `harness agent run <role> <spec>` embeds it
in the agent prompt. In strict traceability mode a requirement cannot leave Tester without its
BDD scenario, TDD test and `@adversarial:REQ-…` evidence. Adversarial cases include malformed
DTOs, missing/null/wrong-type fields, authorization, replay/duplicates, boundaries, injection and
concurrency where applicable. A green happy path alone is explicitly insufficient.

### Project learning without memory drift

Agents do not edit durable knowledge while coding. They send source-backed observations to
`memory/inbox/`; the Memory Steward validates and deduplicates them before promotion into
versioned `brain/patterns/` or an ADR. That turns repeated use into better project-specific rules
without allowing an agent to “learn” unverified claims or overwrite the team’s decisions.

## 🧠 Memory & Context

The harness memory is Markdown in `brain/`, `specs/` and `memory/`. Open `.harness/`
as an **Obsidian vault** (a Map of Content is auto-generated in `memory/obsidian/MOC.md`).

### Tiered Loading (Token Optimization)

| Tier | Content | Tokens | When |
|------|---------|--------|------|
| **Working** | Sectioned agent rules + active spec | 250 | Every context request |
| **Episodic** | Current task, claims and recent events | 200 | When relevant |
| **Semantic** | Local vectors + BM25 + provenance graph | 600 | Query-driven retrieval |
| **Reserve** | Direct evidence dependencies | 150 | Only if budget remains |

### Retrieval (RAG)

- Markdown is the versioned source of truth. Derived BM25, graph and semantic indexes live under
  `.harness/.index/`; the pinned local model lives in `.harness/.models/` and is rebuildable.
- Semantic vectors use the multilingual local ONNX model, are incrementally rebuilt by chunk,
  and work offline after `harness init` has provisioned the model.
- If semantic inference cannot run, `harness context` explicitly degrades to provenance graph +
  BM25 instead of failing work or using a cloud provider.
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

- 10 built-in agents are auto-registered with competency scripts at `harness init`; supporting
  backend, frontend and security specialists assist the core six-stage flow, while the Memory
  Steward is the sole durable-memory writer.
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
# Results: 118 passed, 0 failed
```

The suite includes strict SDD→BDD→TDD traceability, adversarial-evidence gates, hard context
budgets, Memory Steward single-writer behavior, task-claim collisions, semantic-index manifest
compatibility, incremental vector reuse, Spanish retrieval after provisioning, and deterministic
BM25+graph fallback. Before publishing a release, also run:

```bash
npm run test:smoke
npm audit --audit-level=moderate
openspec validate superoptimize-quality-memory-agent-workflows --strict
```

## 📄 License

MIT
