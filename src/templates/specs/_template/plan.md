# Plan {{id}}: {{name}}

> **Status:** Draft → Review → Approved
> **Agent:** Architect
> **Based on:** `specs/{{id}}-{{slug}}/spec.md`

---

## 1. Architecture Overview

### 1.1 High-Level Design
```
[User] → [API Gateway] → [Controller] → [Use Case] → [Repository] → [Database]
                ↓
           [Event Bus] → [Worker] → [External Service]
```

### 1.2 Component Diagram
```
┌─────────────────┐
│   Controller    │  ← HTTP handlers, input validation
└────────┬────────┘
         │
┌────────▼────────┐
│   Use Case      │  ← Business logic, orchestration
└────────┬────────┘
         │
┌────────▼────────┐
│   Repository    │  ← Data access abstraction
└────────┬────────┘
         │
┌────────▼────────┐
│   Database      │  ← PostgreSQL / Redis
└─────────────────┘
```

---

## 2. Module Structure

```
src/
├── domain/
│   ├── entities/
│   │   └── [Entity].ts
│   ├── value-objects/
│   ├── repositories/
│   │   └── [IRepository].ts        # Port
│   └── events/
│
├── application/
│   ├── use-cases/
│   │   └── [UseCase].ts
│   ├── dto/
│   └── services/
│
├── infrastructure/
│   ├── persistence/
│   │   └── [RepositoryImpl].ts     # Adapter
│   ├── http/
│   │   ├── controllers/
│   │   └── middleware/
│   └── external/
│       └── [ServiceClient].ts
│
└── shared/
    ├── errors/
    ├── utils/
    └── types/
```

---

## 3. Data Flow

### 3.1 Happy Path
1. [Step 1: Input validation]
2. [Step 2: Business logic]
3. [Step 3: Persistence]
4. [Step 4: Response]

### 3.2 Error Paths
| Error | Handler | Response |
|-------|---------|----------|
| Validation | [Handler] | 400 + details |
| Not Found | [Handler] | 404 |
| Conflict | [Handler] | 409 |
| Internal | [Handler] | 500 + requestId |

---

## 4. Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| [Decision 1] | [Option] | [Why] |
| [Decision 2] | [Option] | [Why] |

**ADR Reference:** `brain/decisions/{{id}}-{{slug}}-adr.md`

---

## 5. Database Schema

### 5.1 Tables
```sql
CREATE TABLE [table_name] (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  [column] [type] [constraints],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_[table]_[column] ON [table_name]([column]);
```

### 5.2 Migrations
- Migration name: `{{timestamp}}_{{slug}}.sql`
- Rollback strategy: [description]

---

## 6. API Design

### 6.1 Routes
| Method | Path | Handler | Auth |
|--------|------|---------|------|
| POST | /api/v1/[resource] | [Handler] | [Required/Optional] |

### 6.2 Validation Schema
```typescript
const CreateSchema = z.object({
  field: z.string().min(1).max(255),
  email: z.string().email(),
});
```

---

## 7. Testing Strategy

### 7.1 Unit Tests
- Target: Domain + Application layers
- Mock: Infrastructure dependencies
- Coverage: 100% of branches

### 7.2 Integration Tests
- Target: Repository + External services
- Database: Test container (PostgreSQL)
- External: WireMock / MSW

### 7.3 E2E Tests
- Target: Full HTTP flow
- Tool: Playwright / Cypress
- Data: Seeded test database

---

## 8. Deployment

### 8.1 Environment Variables
```env
[FEATURE]_ENABLED=true
[FEATURE]_TIMEOUT_MS=5000
```

### 8.2 Feature Flags
- Flag name: `[feature].enabled`
- Default: `false`
- Rollout: 1% → 10% → 50% → 100%

---

## 9. Monitoring

### 9.1 Metrics
| Metric | Type | Alert |
|--------|------|-------|
| [Metric] | Counter/Gauge/Histogram | [Threshold] |

### 9.2 Logs
- Operation: `[Feature].[Action]`
- Correlation ID: `x-request-id`

---

## 10. Task Breakdown

See `tasks.md` for atomic implementation tasks.

---

*This plan must be approved before Tester Agent generates BDD/TDD artifacts.*
