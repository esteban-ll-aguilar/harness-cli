# Tasks {{id}}: {{name}}

> **Status:** Backlog → In Progress → Review → Done
> **Agent:** Coder
> **Based on:** `specs/{{id}}-{{slug}}/plan.md`

---

## Task List

### Task 1: [Domain Entity]
**Agent:** Coder
**Priority:** Must Have
**Estimate:** [X] hours
**Dependencies:** None

**Description:**
Implement the [Entity] domain entity with validation rules.

**Acceptance Criteria:**
- [ ] Entity has all fields from spec
- [ ] Validation rules implemented
- [ ] Unit tests cover all validation paths (Red-Green-Refactor)
- [ ] No infrastructure dependencies

**Files:**
- `src/domain/entities/[Entity].ts`
- `src/domain/entities/[Entity].test.ts`

**BDD Ref:** `features/{{slug}}.feature` Scenario: [name]

---

### Task 2: [Repository Port]
**Agent:** Coder
**Priority:** Must Have
**Estimate:** [X] hours
**Dependencies:** Task 1

**Description:**
Define the repository interface (port) for [Entity].

**Acceptance Criteria:**
- [ ] Interface defines all CRUD operations
- [ ] Return types use domain entities
- [ ] No implementation details in interface

**Files:**
- `src/domain/repositories/[IEntityRepository].ts`

---

### Task 3: [Use Case]
**Agent:** Coder
**Priority:** Must Have
**Estimate:** [X] hours
**Dependencies:** Task 2

**Description:**
Implement the [Action] use case with business logic.

**Acceptance Criteria:**
- [ ] Use case orchestrates domain logic
- [ ] Error handling for all failure modes
- [ ] Unit tests with mocked repository
- [ ] Coverage > 90%

**Files:**
- `src/application/use-cases/[ActionUseCase].ts`
- `src/application/use-cases/[ActionUseCase].test.ts`

**BDD Ref:** `features/{{slug}}.feature` Scenario: [name]

---

### Task 4: [Repository Implementation]
**Agent:** Coder
**Priority:** Must Have
**Estimate:** [X] hours
**Dependencies:** Task 2

**Description:**
Implement the PostgreSQL repository adapter.

**Acceptance Criteria:**
- [ ] All interface methods implemented
- [ ] SQL parameterized (no injection risk)
- [ ] Integration tests with test database
- [ ] Migrations written

**Files:**
- `src/infrastructure/persistence/[EntityRepositoryPg].ts`
- `src/infrastructure/persistence/[EntityRepositoryPg].test.ts`
- `migrations/{{timestamp}}_[slug].sql`

---

### Task 5: [HTTP Controller]
**Agent:** Coder
**Priority:** Must Have
**Estimate:** [X] hours
**Dependencies:** Task 3, Task 4

**Description:**
Implement the HTTP controller and routes.

**Acceptance Criteria:**
- [ ] Input validation (zod schema)
- [ ] Auth middleware applied
- [ ] Error middleware handles domain errors
- [ ] E2E tests for all endpoints
- [ ] OpenAPI spec updated

**Files:**
- `src/infrastructure/http/controllers/[EntityController].ts`
- `src/infrastructure/http/routes/[entity].ts`
- `tests/e2e/[entity].spec.ts`

---

### Task 6: [Integration / External Service]
**Agent:** Coder
**Priority:** Should Have
**Estimate:** [X] hours
**Dependencies:** Task 3

**Description:**
Integrate with [External Service].

**Acceptance Criteria:**
- [ ] Client implements port interface
- [ ] Circuit breaker pattern
- [ ] Retry with exponential backoff
- [ ] Timeout configured
- [ ] Mock for tests

**Files:**
- `src/infrastructure/external/[ServiceClient].ts`
- `src/infrastructure/external/[ServiceClient].test.ts`

---

## Task Dependency Graph

```
Task 1 (Entity)
    ↓
Task 2 (Repository Port)
    ↓
Task 3 (Use Case) ←────── Task 4 (Repository Impl)
    ↓                           ↓
    └──────────→ Task 5 (Controller)
                      ↓
                 Task 6 (External)
```

---

## Definition of Done (per task)

- [ ] Code written (Red-Green-Refactor)
- [ ] Tests pass (unit + integration)
- [ ] Lint passes (zero warnings)
- [ ] Spec compliance verified
- [ ] Memory log updated

---

*Coder Agent: Pick tasks in order. Mark as done before next.*
