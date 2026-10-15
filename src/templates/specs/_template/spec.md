# Spec {{id}}: {{name}}

> **Status:** Draft → Review → Approved → Implemented → Verified → Done
> **Agent:** Architect
> **Last Updated:** {{date}}

---

## 1. Overview

### 1.1 Purpose
[One sentence: what this feature does and why it matters]

### 1.2 Scope
**In Scope:**
- [Capability 1]
- [Capability 2]

**Out of Scope:**
- [Explicitly excluded 1]
- [Explicitly excluded 2]

### 1.3 Stakeholders
| Role | Interest |
|------|----------|
| [End User] | [What they need] |
| [Admin] | [What they need] |
| [Developer] | [What they need] |

---

## 2. Requirements (EARS Notation)

### 2.1 Functional Requirements

#### REQ-001: [Requirement Name]
- **Priority:** Must Have | Should Have | Could Have | Won't Have
- **EARS:** The system shall [action] when [condition].
- **Acceptance Criteria:**
  1. [Criterion 1]
  2. [Criterion 2]
- **BDD Ref:** See `features/{{slug}}.feature` Scenario: [name]

#### REQ-002: [Requirement Name]
- **Priority:** Must Have
- **EARS:** When [event], the system shall [action].
- **Acceptance Criteria:**
  1. [Criterion 1]
- **BDD Ref:** See `features/{{slug}}.feature` Scenario: [name]

#### REQ-003: [Requirement Name]
- **Priority:** Should Have
- **EARS:** While [state], the system shall [action].
- **Acceptance Criteria:**
  1. [Criterion 1]

### 2.2 Non-Functional Requirements

#### REQ-004: Performance
- **EARS:** The system shall respond to [action] within [time] for [load].
- **Metric:** P95 < 200ms @ 1000 concurrent users
- **Test:** Load test in `tests/performance/`

#### REQ-005: Security
- **EARS:** The system shall [security action] for all [resource].
- **Standard:** OWASP Top 10 compliance
- **Test:** Security scan in CI

#### REQ-006: Reliability
- **EARS:** The system shall maintain [availability] during [condition].
- **Metric:** 99.9% uptime
- **Test:** Chaos engineering tests

### 2.3 Constraints
- **Technical:** [Constraint 1]
- **Business:** [Constraint 2]
- **Regulatory:** [Constraint 3]

---

## 3. User Stories

### US-001: [Role] wants [goal]
> As a [role]
> I want [goal]
> So that [benefit]

**Acceptance Criteria:**
- [ ] Given [context], when [action], then [result]
- [ ] Given [error context], when [action], then [error result]

---

## 4. Data Model

### 4.1 Entities
```typescript
// Example:
interface User {
  id: string;           // UUID v4
  email: string;        // Validated email format
  createdAt: Date;
  updatedAt: Date;
}
```

### 4.2 State Machine
```
[State A] --event--> [State B]
[State B] --event--> [State C]
[State B] --error--> [State D]
```

---

## 5. API Specification

### 5.1 Endpoints

#### POST /api/v1/[resource]
**Request:**
```json
{
  "field": "type"
}
```

**Response 200:**
```json
{
  "id": "uuid",
  "field": "value"
}
```

**Response 4xx:**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Field is required",
  "field": "field"
}
```

**Response 5xx:**
```json
{
  "error": "INTERNAL_ERROR",
  "requestId": "uuid"
}
```

### 5.2 Error Codes
| Code | HTTP | Description | Retryable |
|------|------|-------------|-----------|
| VALIDATION_ERROR | 400 | Invalid input | No |
| UNAUTHORIZED | 401 | Not authenticated | No |
| RATE_LIMITED | 429 | Too many requests | Yes |

---

## 6. UI/UX (if applicable)

### 6.1 Wireframes
[Link or description]

### 6.2 Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support

---

## 7. Dependencies

### 7.1 External
- [Service/API] — [Purpose] — [SLA]

### 7.2 Internal
- [Module/Spec] — [Interface]

---

## 8. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| [Risk 1] | High/Med/Low | High/Med/Low | [Action] |

---

## 9. Definition of Done

- [ ] Spec reviewed and approved
- [ ] BDD scenarios written and reviewed
- [ ] TDD tests written (all failing = Red phase)
- [ ] Code implemented (Green phase)
- [ ] Refactoring complete
- [ ] Reviewer approved
- [ ] Guardian gates passed (lint, tests, coverage, security)
- [ ] ADR written (if architectural decision)
- [ ] Documentation updated

---

## 10. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | {{date}} | Architect | Initial draft |

---

*This spec follows EARS notation and SDD methodology.*
*Any change requires version bump + approval.*
