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

**Root references:**
- `AGENTS.md` → copy of `.harness/brain/AGENTS.md`
- `.harnessrc` → project configuration
- `.obsidian` → symlink/junction to `.harness/.obsidian`

---

## 5. Workflow Obligatorio (The 6 Agents)

You MUST follow this sequence. No skipping phases.

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

This project uses **tiered memory** to optimize tokens:

- **ALWAYS loaded:** AGENTS.md + constitution.md + north-star.md (~500 tokens)
- **ON DEMAND:** Search brain/ for relevant context
- **TRIGGER:** Load spec.md when working on that feature
- **RARE:** Full vault scan (only on explicit request)

**For AI tools:** Read `.harnessrc` to understand project state before acting.

---

## 10. Commands Reference

| Command | Description |
|---------|-------------|
| `/harness-new-change <name>` | Create new SDD-BDD-TDD feature flow |
| `/harness-status` | Show project health & progress |
| `/harness-review` | Run guardian quality gates |
| `/harness-interview` | Start requirement gathering |
| `/harness-spec <name>` | Generate spec template |

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
