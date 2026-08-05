# Agent Handoff Protocol

> **Context is everything.** A handoff without context is a handoff without value.

---

## What is the Handoff Protocol?

The Handoff Protocol is the structured way agents pass work to each other in the Harness workflow. It ensures:

- **No context loss** — Everything the next agent needs is included
- **Clear accountability** — Who did what, what's blocked, what's next
- **Traceability** — Full audit trail in `memory/session-logs/`
- **Efficiency** — Next agent starts immediately, no back-and-forth

---

## The 6-Agent Handoff Chain

```
🎙️ Interviewer ──handoff──► 📐 Architect ──handoff──► 🧪 Tester
      ↑                                                      │
      └────────────── 🛡️ Guardian ◄──handoff── 🔍 Reviewer ◄─┘
                                    ▲
                                    └──handoff── 💻 Coder
```

---

## Handoff Template

Every handoff MUST follow this format:

```markdown
---
date: 2026-08-04T14:36:00Z
from: [Agent Role]
to: [Next Agent Role]
spec: specs/NNN-feature-name/
status: [current status]
---

# Handoff: [From] → [To]

## Context Summary

[What was accomplished in this phase? 2-3 sentences max.]

## Key Decisions

- [Decision 1 and why]
- [Decision 2 and why]

## Files Created/Modified

- `specs/NNN-feature/spec.md` — [What changed]
- `specs/NNN-feature/plan.md` — [What changed]
- `src/...` — [What changed]

## Blockers

- [NONE | List of blockers with proposed solutions]

## Next Steps

1. [Specific action for next agent]
2. [Specific action for next agent]
3. [Specific action for next agent]

## Questions for Next Agent

- [Question 1]
- [Question 2]

## Confidence Level

- [High / Medium / Low] — [Why]
```

---

## Handoff Examples

### Example 1: Interviewer → Architect

```markdown
---
date: 2026-08-04T10:00:00Z
from: Interviewer
to: Architect
spec: specs/001-auth-magic-link/
status: requirements-gathered
---

# Handoff: Interviewer → Architect

## Context Summary

Completed structured interview with product owner. Gathered requirements for magic link authentication system. Identified 3 ambiguities that were clarified.

## Key Decisions

- Magic links are single-use (not reusable until expiry)
- Rate limit: 3 requests per hour per email
- Token expiry: 15 minutes (not configurable for MVP)

## Files Created/Modified

- `memory/session-logs/interview-2026-08-04.md` — Full interview transcript
- `memory/session-logs/clarify-2026-08-04.md` — Clarification responses

## Blockers

- NONE

## Next Steps

1. Read interview transcript and clarifications
2. Write `spec.md` using EARS notation
3. Define acceptance criteria for each requirement
4. Get stakeholder approval before proceeding

## Questions for Architect

- Should we support multiple active magic links per user?
- What happens to pending links when a new one is requested?

## Confidence Level

- High — Requirements are clear and well-defined
```

### Example 2: Architect → Tester

```markdown
---
date: 2026-08-04T12:00:00Z
from: Architect
to: Tester
spec: specs/001-auth-magic-link/
status: spec-approved
---

# Handoff: Architect → Tester

## Context Summary

Spec and plan approved by stakeholder. Architecture decided: Clean Architecture with PostgreSQL repository, SendGrid for emails, Redis for rate limiting.

## Key Decisions

- Architecture: Clean Architecture (hexagonal)
- Database: PostgreSQL with UUID primary keys
- Email: SendGrid API with circuit breaker
- Rate limiting: Redis sliding window
- ADR-001: Chose SendGrid over AWS SES (better deliverability)

## Files Created/Modified

- `specs/001-auth-magic-link/spec.md` — Approved specification
- `specs/001-auth-magic-link/plan.md` — Technical architecture
- `specs/001-auth-magic-link/tasks.md` — 6 atomic tasks
- `brain/decisions/001-auth-adr.md` — ADR for email provider

## Blockers

- NONE

## Next Steps

1. Read spec.md and plan.md
2. Write BDD scenarios in `features/auth.feature`
3. Write TDD test stubs in `tests/`
4. Ensure all tests FAIL before coding (Red phase)
5. Mark tasks as ready for Coder

## Questions for Tester

- Should we test the circuit breaker behavior?
- What edge cases for token generation should we cover?

## Confidence Level

- High — Architecture is standard, no novel patterns
```

### Example 3: Tester → Coder

```markdown
---
date: 2026-08-04T14:00:00Z
from: Tester
to: Coder
spec: specs/001-auth-magic-link/
status: tests-written
---

# Handoff: Tester → Coder

## Context Summary

BDD scenarios and TDD tests written. All 12 unit tests are in Red phase (failing). 4 integration tests prepared. E2E scenarios defined.

## Key Decisions

- 12 unit tests covering: entity validation, use cases, idempotency
- 4 integration tests: DB operations, SQL injection, API endpoints
- 2 E2E scenarios: happy path + error path

## Files Created/Modified

- `specs/001-auth-magic-link/features/auth.feature` — 6 BDD scenarios
- `specs/001-auth-magic-link/tests/auth.test.ts` — 12 unit tests (all failing)
- `tests/integration/auth.spec.ts` — 4 integration tests
- `tests/e2e/auth.spec.ts` — 2 E2E tests

## Blockers

- NONE

## Next Steps

1. Read tasks.md — tasks are ordered by dependency
2. Implement Task 1: Domain Entity (Red-Green-Refactor)
3. Implement Task 2: Repository Port
4. Continue through all 6 tasks
5. Run tests after each task — all must pass before next task

## Questions for Coder

- Task 3 has a note about transaction boundaries — review plan.md section 4.2
- Consider using `uuid` package or native crypto for token generation

## Confidence Level

- Medium — Some integration tests require test DB setup
```

### Example 4: Coder → Reviewer

```markdown
---
date: 2026-08-04T16:00:00Z
from: Coder
to: Reviewer
spec: specs/001-auth-magic-link/
status: implementation-complete
---

# Handoff: Coder → Reviewer

## Context Summary

All 6 tasks implemented. All 12 unit tests pass. 4 integration tests pass. Code follows Clean Architecture. No lint warnings. Coverage: 87%.

## Key Decisions

- Used `crypto.randomUUID()` for token generation (native, no dependency)
- Implemented circuit breaker with 3-failure threshold
- Added request ID middleware for tracing

## Files Created/Modified

- `src/domain/entities/AuthToken.ts` — Token entity with validation
- `src/domain/repositories/IAuthTokenRepository.ts` — Port interface
- `src/application/use-cases/GenerateMagicLinkUseCase.ts` — Use case
- `src/infrastructure/persistence/AuthTokenRepositoryPg.ts` — Adapter
- `src/infrastructure/http/controllers/AuthController.ts` — HTTP handler
- `src/infrastructure/external/SendGridClient.ts` — Email client
- `migrations/20260804140000_auth_magic_link.sql` — DB migration

## Blockers

- NONE

## Next Steps

1. Compare implementation against spec.md acceptance criteria
2. Verify all BDD scenarios are implemented
3. Check for security issues (secrets, SQL injection, XSS)
4. Verify coverage > 80%
5. Run `harness review` for automated checks

## Questions for Reviewer

- Is the circuit breaker threshold appropriate?
- Should we add more logging for debugging?

## Confidence Level

- High — All tests pass, architecture clean
```

### Example 5: Reviewer → Guardian

```markdown
---
date: 2026-08-04T17:00:00Z
from: Reviewer
to: Guardian
spec: specs/001-auth-magic-link/
status: review-passed
---

# Handoff: Reviewer → Guardian

## Context Summary

Code review completed. All acceptance criteria met. BDD scenarios implemented. No security issues found. Coverage: 87%.

## Key Decisions

- Approved with 2 minor suggestions (non-blocking):
  1. Add more detailed error logging
  2. Consider increasing circuit breaker timeout

## Files Created/Modified

- All implementation files reviewed
- `memory/session-logs/review-001-auth.md` — Review report

## Blockers

- NONE

## Next Steps

1. Run full CI pipeline (lint, tests, coverage, security scan)
2. Verify all Guardian gates pass
3. Mark spec as DONE in .harnessrc
4. Merge to main branch

## Questions for Guardian

- N/A

## Confidence Level

- High — Ready for production
```

---

## Handoff Anti-Patterns

❌ **No context** — "Here, take this." → Agent wastes time figuring out what's happening

❌ **Missing files** — Handoff references files that don't exist or have wrong paths

❌ **Vague next steps** — "Do the thing" → Agent doesn't know what "the thing" is

❌ **Hidden blockers** — "Everything is fine" → But actually there's a critical issue

❌ **No confidence level** — Reviewer doesn't know if they should be thorough or quick

---

## Automation

The Harness CLI can generate handoff templates:

```bash
# After completing a phase, auto-generate handoff
harness handoff --from interviewer --to architect --spec 001-auth
```

This creates:
- `memory/session-logs/handoff-interviewer-architect-001-auth.md`
- Pre-filled with context from the previous phase
- Ready for the next agent to pick up

---

## Handoff Checklist

- [ ] Date and time recorded
- [ ] From/To agents identified
- [ ] Spec reference included
- [ ] Context summary written (2-3 sentences)
- [ ] Key decisions documented
- [ ] All files listed with descriptions
- [ ] Blockers explicitly stated (or "NONE")
- [ ] Next steps are specific and actionable
- [ ] Questions for next agent included
- [ ] Confidence level stated with justification
