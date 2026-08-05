# SDD Guide — Specification-Driven Development

> **Spec = Single Source of Truth.** The code serves the spec, not the other way around.

---

## What is SDD?

Specification-Driven Development (SDD) is a methodology where an **executable, version-controlled specification** — not the code — is the single source of truth.

```
User Request → Interview → Spec → Plan → Tasks → BDD → TDD → Code → Review
                    ↑_________________________________________________↓
                              (feedback loop, spec is king)
```

## The 4 Phases

### Phase 1: Specify
**Agent:** Interviewer + Architect
**Output:** `specs/NNN-feature/spec.md`

The spec captures WHAT the system must do, not HOW.

**Key principles:**
- One spec per feature
- Written in EARS notation (unambiguous)
- Includes acceptance criteria
- Defines "Definition of Done"
- Human approval REQUIRED before proceeding

### Phase 2: Plan
**Agent:** Architect
**Output:** `specs/NNN-feature/plan.md`

The plan captures HOW the system will do it.

**Key principles:**
- Architecture decisions documented
- Technology choices justified (with ADR if needed)
- Database schema defined
- API contract specified
- Task breakdown created

### Phase 3: Tasks
**Agent:** Architect
**Output:** `specs/NNN-feature/tasks.md`

Atomic, implementable tasks.

**Key principles:**
- Each task < 4 hours
- Clear acceptance criteria per task
- Dependencies explicit
- One concept per task

### Phase 4: Implement
**Agent:** Coder
**Output:** Production code

Code is written to satisfy the spec, guided by BDD/TDD.

---

## EARS Notation

EARS (Easy Approach to Requirements Syntax) eliminates ambiguity.

### Patterns

| Pattern | Structure | Example |
|---------|-----------|---------|
| **Ubiquitous** | `The system shall [action]` | The system shall generate a unique token. |
| **Event-driven** | `When [event], the system shall [action]` | When a user requests auth, the system shall send a magic link. |
| **State-driven** | `While [state], the system shall [action]` | While unauthenticated, the system shall redirect to login. |
| **Optional** | `Where [feature], the system shall [action]` | Where MFA is enabled, the system shall require a second factor. |
| **Unwanted** | `If [condition], the system shall [action]` | If the token is expired, the system shall reject the request. |

### Example Spec

```markdown
## Requirements

### FR-001: Magic Link Generation
- **Priority:** Must Have
- **EARS:** The system shall generate a unique magic link token when a user requests authentication.
- **Acceptance Criteria:**
  1. Token is cryptographically random (256 bits)
  2. Token is single-use
  3. Token expires after 15 minutes

### FR-002: Magic Link Invalidation
- **Priority:** Must Have
- **EARS:** When a magic link is used, the system shall invalidate it immediately.
- **Acceptance Criteria:**
  1. Used token cannot be reused
  2. Invalidation is atomic (no race conditions)

### FR-003: Rate Limiting
- **Priority:** Must Have
- **EARS:** If a user requests more than 3 magic links in 1 hour, the system shall block further requests for 1 hour.
- **Acceptance Criteria:**
  1. Rate limit is per email address
  2. Blocked users receive a 429 response
```

---

## Spec Structure

Every spec.md MUST contain:

1. **Overview** — Purpose, scope, stakeholders
2. **Requirements** — Functional (EARS) + Non-functional
3. **User Stories** — As a / I want / So that
4. **Data Model** — Entities, state machines
5. **API Specification** — Endpoints, request/response, errors
6. **UI/UX** — Wireframes, accessibility (if applicable)
7. **Dependencies** — External + internal
8. **Risks & Mitigations** — What could go wrong
9. **Definition of Done** — Checklist for completion
10. **Revision History** — Who changed what and when

---

## Spec Lifecycle

```
Draft → Review → Approved → Implemented → Verified → Done
  ↑________________________________________________↓
            (changes require version bump + approval)
```

- **Draft:** Architect writes initial version
- **Review:** Stakeholder + team review
- **Approved:** Locked for implementation
- **Implemented:** Coder writes code
- **Verified:** Reviewer confirms spec compliance
- **Done:** Guardian gates pass

---

## Common Mistakes

❌ **Vague requirements:** "The system should be fast"
✅ **Specific:** "The system shall respond within 200ms (P95)"

❌ **Implementation details in spec:** "Use Redis for caching"
✅ **Requirement:** "The system shall cache responses for 5 minutes"

❌ **Missing acceptance criteria**
✅ **Every requirement has measurable acceptance criteria**

❌ **No out-of-scope definition**
✅ **Explicitly state what the system will NOT do**

---

## Tools

- **Obsidian:** Write specs as markdown with graph view
- **Harness CLI:** `harness spec <name>` generates template
- **AI Agent:** Architect agent helps draft EARS requirements
