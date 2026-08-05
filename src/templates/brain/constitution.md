# Constitution — Leyes del Proyecto

> **This is the supreme law.** No code, no spec, no decision may violate these rules.
> Any exception requires a ADR with explicit justification.

---

## 1. Arquitectura

### 1.1 Clean Architecture / Hexagonal
- Domain logic is PURE — no framework dependencies
- Infrastructure lives in outer layers
- Dependencies point INWARD (Domain ← Use Cases ← Adapters)

### 1.2 Ports and Adapters
- Define interfaces (ports) in domain
- Implement adapters in infrastructure
- NEVER import infrastructure into domain

### 1.3 Module Boundaries
- Each spec gets its own module boundary
- Cross-module communication via explicit APIs only
- No circular dependencies

---

## 2. Calidad de Código

### 2.1 Testing
- **Coverage mínima: 80%** (branches, not just lines)
- TDD obligatorio: test primero, código después
- BDD obligatorio: cada feature tiene .feature file
- Integration tests for external boundaries
- E2E tests for critical user flows

### 2.2 Estilo
- ESLint: zero warnings
- Prettier: auto-format on save
- Max 200 líneas por archivo
- Max 20 líneas por función
- Nombres descriptivos: `getUserByEmail`, no `getUser`

### 2.3 Tipado
- TypeScript: strict mode
- NO `any` sin justificación documentada
- NO `as` casts sin validación previa
- Tipos de dominio en `src/domain/types/`

---

## 3. Seguridad

### 3.1 Datos
- Secrets: nunca en código, nunca en logs
- Usar `.env` + secret manager
- Rotación de secrets cada 90 días

### 3.2 Input
- SQL parametrizado obligatorio
- Validación de input en boundary (zod, joi, class-validator)
- Sanitización de output (XSS prevention)

### 3.3 Autenticación
- JWT con refresh tokens
- Rate limiting: 100 req/min por IP, 1000 req/min por user
- MFA para operaciones críticas

### 3.4 Autorización
- RBAC (Role-Based Access Control)
- Principio de mínimo privilegio
- Audit logs para accesos sensibles

---

## 4. Performance

### 4.1 Latencia
- P95 < 200ms para endpoints críticos
- P99 < 500ms para endpoints normales

### 4.2 Base de Datos
- Índices en todas las foreign keys
- NO N+1 queries (use eager loading o DataLoader)
- Paginación obligatoria para listados (>100 items)

### 4.3 Caché
- Redis para sesiones y rate limiting
- Cache-Control headers para assets estáticos
- Invalidación explícita, no TTL-only

---

## 5. Operaciones

### 5.1 Logging
- Structured JSON logs
- Nivel INFO en producción
- Nivel DEBUG solo en desarrollo
- NUNCA loggear PII (emails, passwords, tokens)

### 5.2 Monitoreo
- Métricas: latency, throughput, error rate
- Alertas: P99 > 1s, error rate > 0.1%, disk > 80%
- Health checks: /health, /ready

### 5.3 Deploy
- CI/CD obligatorio
- Blue-green o canary deploys
- Rollback automático si error rate > 1%

---

## 6. Documentación

### 6.1 Código
- JSDoc/TSDoc para funciones públicas
- README.md en cada módulo
- ADR para decisiones arquitectónicas

### 6.2 API
- OpenAPI/Swagger para todos los endpoints
- Ejemplos de request/response
- Códigos de error documentados

---

## 7. Proceso

### 7.1 SDD-BDD-TDD
- Ningún código sin spec
- Ningún spec sin BDD scenarios
- Ningún código sin tests
- Review obligatorio antes de merge

### 7.2 Versionado
- SemVer para releases
- CHANGELOG.md mantenido
- Tags git para cada release

### 7.3 Dependencias
- NUEVA dependencia = ADR obligatorio
- Preferir dependencias con LTS
- Auditar vulnerabilidades semanalmente (`npm audit`)

---

*Ratified: {{date}}*
*Amendments require unanimous approval + ADR*
