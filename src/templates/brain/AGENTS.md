# AGENTS.md — Manual de Operación del Proyecto

> **READ THIS FIRST.** This file is the single source of truth for ANY AI tool working on this project.
> Compatible with: Claude Code, Codex CLI, OpenCode, Kimi, Qwen, DeepSeek, Cursor, Copilot, and any future AI.

---

## 1. Project Identity

- **Project Name:** {{projectName}}
- **Harness ID:** {{projectName}}-{{date}}
- **Purpose:** See `brain/north-star.md`
- **Created:** {{date}}

---

## 2. Stack Tecnológico (DEFAULT — override in spec if needed)

| Layer | Technology |
|-------|------------|
| Language | TypeScript (strict mode) |
| Runtime | Node.js 20+ |
| Framework | Next.js 14+ (App Router) |
| Database | PostgreSQL 15+ |
| ORM | Prisma |
| Testing | Vitest (unit), Playwright (e2e) |
| BDD | Cucumber / Gherkin |
| Lint | ESLint + Prettier |
| CI | GitHub Actions |

> **RULE:** If a spec requires a different stack, document it in the spec's ADR.

### 2.1 Build, Test & Lint Commands

| Action | Command |
|--------|---------|
| Install deps | `npm install` |
| Run all tests | `npm test` |
| Run one spec's tests | `harness test <specId>` |
| Lint | `npm run lint` |
| Build | `npm run build` |
| Dev server | `npm run dev` |

> **RULE:** Keep this table accurate — it's what every AI tool runs before claiming
> something works. Update it the moment a command changes.

### 2.2 Commit & PR Conventions

- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`.
- One logical change per commit; reference the spec id when applicable (`specs/NNN-x`).
- PR description: what changed + why, plus the `harness review` output for the touched spec.

---

## 3. Reglas Inmutables (Constitution)

These rules are NON-NEGOTIABLE. They apply to ALL code, ALL agents, ALL specs.

1. **NO dependencies** without an approved ADR in `brain/decisions/`
2. **ALL public functions** MUST have unit tests (TDD)
3. **ALL features** MUST have BDD scenarios in `specs/NNN-xxx/features/`
4. **ALL endpoints** MUST have authentication (unless explicitly exempted in spec)
5. **MAX 200 lines** per file. Split if larger.
6. **NO `any` in TypeScript** / NO `interface{}` without justification
7. **SQL MUST be parameterized** — never concatenate user input
8. **Secrets NEVER in logs** or version control
9. **Rate limiting** on ALL public endpoints
10. **Coverage minimum 80%** — guardian will block if lower

Read the full constitution: `brain/constitution.md`

---

## 4. Estructura de Carpetas

```
.harness/
├── brain/              # Persistent knowledge (git-tracked)
│   ├── AGENTS.md       # This file
│   ├── constitution.md # Immutable rules
│   ├── north-star.md   # Vision & goals
│   ├── decisions/      # Architecture Decision Records (ADRs)
│   ├── people/         # Stakeholder profiles
│   ├── patterns/       # Architectural patterns
│   └── competencies/   # Team skills & standards
├── memory/             # Session logs (NOT git-tracked)
│   └── session-logs/   # Per-session transcripts
├── specs/              # SDD Specifications
│   └── NNN-feature/
│       ├── spec.md     # EARS notation requirements
│       ├── plan.md     # Technical architecture
│       ├── tasks.md    # Atomic tasks
│       ├── features/   # BDD .feature files
│       ├── tests/      # TDD test stubs
│       └── docs/       # Additional documentation
├── tests/              # Global test utilities
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .obsidian/          # Obsidian vault config
├── .claude/            # Claude Code hooks
├── .codex/             # Codex CLI hooks
├── .kimi/              # Kimi config
├── .deepseek/          # DeepSeek config
├── .qwen/              # Qwen config
└── scripts/            # Automation scripts
```

**Entry points and ownership:**
- Root `AGENTS.md` → automatic entry point for Codex-compatible agents; it directs agents here.
- `.agents/` → compatibility projection only; never store durable state there.
- `.harness/brain/AGENTS.md` → canonical instructions and durable project knowledge.
- `.harnessrc` → project configuration
- `.obsidian` → symlink/junction to `.harness/.obsidian`

---

## 5. Workflow Obligatorio (6 gates + especialistas)

You MUST follow this sequence. No skipping phases.

**Context and memory rule:** Before work, run `harness context` with the relevant spec/query.
Use `harness work` and `harness quality` as the primary command groups. Agents may submit
evidence-bearing observations to `memory/inbox/`; only the Memory Steward may promote durable
knowledge to `brain/`. Backend Engineer, Frontend Engineer and Security Reviewer are supporting
specialists: they may help a claimed task but never skip an approval gate.

### Phase 1: 🎙️ Interviewer
- **Goal:** Extract complete requirements from user/stakeholder
- **Input:** User request (vague or specific)
- **Output:** Structured interview report in `memory/session-logs/`
- **Trigger:** `/harness-interview` or `harness interview`
- **Questions:** See `brain/competencies/interviewer-script.md`

### Phase 2: 📐 Architect (SDD)
- **Goal:** Write formal specification
- **Input:** Interview report + constitution + north-star
- **Output:** `specs/NNN-xxx/spec.md` (EARS notation) + `plan.md`
- **Trigger:** After interview approval
- **Must:** Get human approval before proceeding

### Phase 3: 🧪 Tester (BDD + TDD)
- **Goal:** Generate executable tests BEFORE code
- **Input:** spec.md + plan.md
- **Output:**
  - `features/xxx.feature` (Given-When-Then)
  - `tests/xxx.test.js` (TDD stubs)
- **Trigger:** After spec approval
- **Must:** All tests must FAIL before coding (Red phase)

### Phase 4: 💻 Coder (Implementation)
- **Goal:** Implement tasks one by one
- **Input:** tasks.md + spec.md + tests/
- **Output:** Production code in `src/`
- **Method:** Red-Green-Refactor per task
- **Constraint:** Code must match spec exactly

### Phase 5: 🔍 Reviewer
- **Goal:** Verify code matches specification
- **Input:** src/ + spec.md + features/
- **Output:** Review report in `memory/session-logs/`
- **Check:** Every acceptance criterion is implemented?
- **If FAIL:** Return to Coder with specific feedback

### Phase 6: 🛡️ Guardian
- **Goal:** Quality gates before production
- **Checks:**
  - Lint: zero warnings
  - Tests: all pass
  - Coverage: ≥80%
  - Security: no secrets, no SQL injection
  - Performance: P95 < 200ms (if applicable)
- **Output:** `memory/session-logs/review-xxx.md`
- **If PASS:** Mark spec as DONE

### Memory Steward: 🧠 Durable-memory gate
- **Goal:** Validate, deduplicate and promote evidence-bearing observations.
- **Input:** `memory/inbox/` only — claim, scope, source and evidence are required.
- **Output:** Versioned pattern/decision plus a promotion or rejection receipt.
- **Constraint:** No other agent writes durable memory. Semantic indexes are derived retrieval
  artifacts, never a source of truth.

### Supporting specialists
- **⚙️ Backend Engineer:** contract-first services, authorization, data integrity, resilient
  external boundaries and integration tests.
- **🖥️ Frontend Engineer:** accessible and responsive UI; loading, empty, error and success
  states; component/E2E evidence.
- **🔐 Security Reviewer:** threat-sensitive review before Guardian for auth, data, abuse and
  dependency risks.

---

## 6. EARS Notation (Requirement Syntax)

ALL requirements in spec.md MUST use EARS patterns:

| Pattern | Keyword | Example |
|---------|---------|---------|
| Ubiquitous | — | "The system shall..." |
| Event-driven | When | "When [event], the system shall..." |
| State-driven | While | "While [state], the system shall..." |
| Optional | Where | "Where [feature], the system shall..." |
| Unwanted | If | "If [condition], the system shall..." |
| Complex | — | Use structured sentences |

**Example:**
```
- The system shall generate a unique magic link token when a user requests authentication.
- When a magic link is used, the system shall invalidate it immediately.
- While the user is unauthenticated, the system shall redirect to the login page.
```

---

## 7. BDD Scenario Template

```gherkin
Feature: [Feature Name]
  As a [role]
  I want [goal]
  So that [benefit]

  Background:
    Given [precondition]

  Scenario: [Happy path]
    Given [initial state]
    When [action]
    Then [expected result]
    And [additional expectation]

  Scenario: [Error path]
    Given [initial state]
    When [invalid action]
    Then [error result]
    And [recovery expectation]

  Scenario: [Edge case]
    Given [extreme state]
    When [action]
    Then [specific result]
```

---

## 8. TDD Rules

1. **Write test FIRST** (Red)
2. **Write MINIMAL code** to pass (Green)
3. **Refactor** while keeping tests green
4. **One concept per test**
5. **Test names are sentences:** `it('should invalidate token after use')`

---

## 9. Memory & Context Loading

This project uses **tiered memory + local hybrid retrieval** over the `.harness` vault
(Markdown in `brain/`, `specs/`, `memory/` — open `.harness/` as an Obsidian vault):

- **ALWAYS loaded:** AGENTS.md (includes every project rule) + constitution.md + north-star.md (~500 tokens)
- **ON DEMAND:** semantic vectors + provenance graph + BM25 + symbol lookup, folded into one
  budgeted call. The semantic model runs locally from `.harness/.models/embeddings`; if it is
  unavailable, graph + BM25 remain the deterministic fallback.
- **TRIGGER:** Load spec.md when working on that feature
- **RARE:** Full vault scan (only on explicit request)

> **RULE — do this automatically, don't wait to be told:** call `harness_context`
> (MCP) / `harness context` (CLI) with `--query=<topic>` and/or `--symbol=<name>`
> at the START of any non-trivial task, before writing code — not because a human
> asked you to "search" or "look something up", but because that's how you find
> prior decisions and existing code before duplicating either. A human will
> rarely think to ask for this explicitly; it's on you to do it proactively.
> `harness_context` already bundles retrieval, symbol lookup, project rules and
> state in one call — there's no separate "search" or "list rules" tool to
> remember to invoke.

---

## 10. Commands Reference

| Command | Description |
|---------|-------------|
| `harness init` | Initialize or repair the canonical entry points |
| `harness work …` | Interview, create/advance a change and run agents |
| `harness memory …` | Search, health, semantic index and Memory Steward operations |
| `harness quality …` | Tests, review, gates, judge and traceability |
| `harness context` | **Call proactively.** Bounded hybrid retrieval and project state |
| `harness status` | Project health & progress |

**BEFORE you act:** read `.harnessrc`, call `harness context --query="<topic>"`
(pulls prior decisions + rules automatically — see section 9), and follow the
project rules in the constitution. MCP and legacy aliases may exist for compatibility, but the
six command groups above are the supported operating surface.

---

## 11. Agent Handoff Protocol

When passing work to another agent, include:

1. **Context summary** (what was done)
2. **Relevant files** (with paths)
3. **Blockers or ambiguities** (if any)
4. **Next steps** (what the next agent should do)

Format:
```
--- AGENT HANDOFF ---
From: [Agent Role]
To: [Next Agent Role]
Spec: specs/NNN-xxx/
Status: [current status]

Context:
- [Summary of work done]
- [Key decisions made]

Files:
- [list of modified/created files]

Blockers:
- [none | list]

Next Steps:
1. [Action 1]
2. [Action 2]
--- END HANDOFF ---
```

---

## 12. Decision Records (ADRs)

Every significant decision MUST be recorded:

```markdown
# ADR-NNN: [Title]

## Status
- Proposed / Accepted / Deprecated

## Context
[What forced this decision?]

## Decision
[What we decided]

## Consequences
- Positive: [...]
- Negative: [...]
- Risks: [...]
```

Store in: `brain/decisions/adr-NNN-title.md`

---

*Last updated: {{date}}*
*This file is maintained by the Harness system. Do not edit manually without ADR.*
