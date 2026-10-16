# Constitution — Leyes del Proyecto

> Esta es la ley suprema del proyecto. Ningún código, spec o decisión puede
> contradecirla. Una regla marcada **aplica cuando corresponda** puede adaptarse
> al stack mediante ADR; las reglas de seguridad, evidencia y honestidad no.

---

## 1. Arquitectura

### 1.1 Límites explícitos
- La lógica de negocio no depende de transporte, framework ni almacenamiento.
- Las dependencias apuntan hacia el dominio; los adaptadores dependen de puertos.
- Cada cambio declara qué contrato público altera y qué capa lo posee.

### 1.2 Puertos y adaptadores
- Definir puertos donde viven los casos de uso y adaptar infraestructura afuera.
- No importar infraestructura dentro del dominio.
- No introducir microservicios, colas o una base nueva sin un ADR que justifique
  complejidad, operación y plan de reversión.

### 1.3 Module Boundaries
- Each spec gets its own module boundary
- Cross-module communication via explicit APIs only
- No circular dependencies

---

## 2. Calidad de Código

### 2.1 Evidencia antes de afirmar
- Ningún requisito sin ID (`REQ-...`), escenario BDD `@covers:REQ-...` y prueba
  TDD que lo cubra. El Guardian reporta huecos; una excepción expira y no cuenta
  como aprobación.
- TDD: Red → Green → Refactor. Las pruebas deben fallar antes del código nuevo.
- Cobertura mínima 80% de ramas **si el stack puede medirla**; no usar cobertura
  como sustituto de escenarios, integración o E2E críticos.
- Cada cambio ejecuta la menor prueba útil y, antes de cerrar, el conjunto
  relevante completo. Nunca declarar éxito sin registrar el comando y resultado.

### 2.2 Diseño mantenible
- Lint/formato sin advertencias cuando existan en el proyecto.
- Preferir funciones y módulos cohesivos; 200 líneas por archivo y 20 por
  función son señales de revisión, no excusas para fragmentar sin sentido.
- Nombres expresan intención, precondiciones y unidad de negocio.

### 2.3 Tipos y contratos
- En TypeScript, `strict`; no `any` ni casts sin una validación documentada.
- En cualquier lenguaje, validar contratos de entrada/salida y conservar los
  tipos de dominio cerca de los casos de uso.

### 2.4 Frontend (cuando corresponda)
- Cada flujo visible cubre estados loading, empty, error y success.
- Semántica HTML, teclado, foco, contraste y lector de pantalla son requisitos,
  no pulido posterior. Validar contra WCAG AA cuando haya interfaz.
- No duplicar reglas de negocio ni permisos en el cliente; manejar fallas de red
  y concurrencia de forma explícita.

### 2.5 Backend (cuando corresponda)
- Diseñar contrato, validación, autorización y errores antes del handler.
- Operaciones mutantes protegen consistencia con transacciones, idempotencia o
  concurrencia explícita según el riesgo.
- Listados grandes se paginan; integrar límites, timeouts, reintentos seguros y
  observabilidad en fronteras externas.

---

## 3. Seguridad

### 3.1 Datos
- Secrets nunca en código, memoria durable, logs o control de versiones.
- Usar el mecanismo de secretos de la plataforma; rotación y retención según
  política del producto, no una cifra inventada por el agente.

### 3.2 Input
- SQL parametrizado obligatorio
- Validación de input en boundary (zod, joi, class-validator)
- Sanitización de output (XSS prevention)

### 3.3 Autenticación
- Elegir el mecanismo de autenticación según el producto y documentarlo.
- Rate limiting, MFA y protección antiabuso aplican según exposición y riesgo;
  los umbrales se definen en spec/ADR y se prueban.

### 3.4 Autorización
- RBAC (Role-Based Access Control)
- Principio de mínimo privilegio
- Audit logs para accesos sensibles

---

## 4. Performance

### 4.1 Presupuestos medibles
- Latencia, capacidad y coste se declaran por flujo crítico en la spec; no se
  inventan SLOs globales sin una línea base.

### 4.2 Base de Datos
- Índices en todas las foreign keys
- NO N+1 queries (use eager loading o DataLoader)
- Paginación obligatoria para listados (>100 items)

### 4.3 Caché (cuando corresponda)
- Toda caché declara propiedad, clave, invalidación, consistencia y métrica.
- Ninguna tecnología de caché es obligatoria por defecto.

---

## 5. Operaciones

### 5.1 Logging
- Structured JSON logs
- Nivel INFO en producción
- Nivel DEBUG solo en desarrollo
- NUNCA loggear PII (emails, passwords, tokens)

### 5.2 Monitoreo
- Medir latencia, throughput, errores y señales de negocio relevantes.
- Alertas y health checks se ajustan al servicio y se prueban si forman parte del
  contrato operativo.

### 5.3 Deploy
- El cambio debe ser desplegable y reversible. La estrategia (CI/CD, canary,
  rollback) se decide según criticidad y queda documentada.

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

### 7.1 SDD → BDD → TDD
- No código de feature sin spec aprobada; no spec sin escenarios BDD; no tarea
  sin prueba antes de implementación. Las correcciones pequeñas documentan la
  excepción y su prueba proporcional.
- El flujo es: Interviewer → Architect → Tester → Coder → Reviewer → Guardian.
  Backend, Frontend y Security son especialistas de apoyo, no saltos del gate.
- El Guardian no marca una spec como completa sin pruebas relevantes verdes,
  traceability sin huecos no justificados y riesgos explícitos.

### 7.2 Versionado
- SemVer para releases
- CHANGELOG.md mantenido
- Tags git para cada release

### 7.3 Dependencias
- NUEVA dependencia = ADR obligatorio
- Preferir dependencias con LTS
- Auditar vulnerabilidades semanalmente (`npm audit`)

### 7.4 Memoria y contexto
- `.harness/brain/` y `specs/` son memoria durable versionada; Obsidian es una
  vista Markdown, no una fuente paralela de verdad.
- Los índices BM25/grafo/vector y el modelo local son derivados reproducibles:
  viven bajo `.harness/.index/` y `.harness/.models/`, no se versionan ni se
  tratan como evidencia primaria.
- Todo agente puede enviar una observación con claim, scope, source y evidence
  a `memory/inbox/`. **Solo Memory Steward** la valida, deduplica y promueve a
  `brain/patterns/`; nunca se promueven secretos, conjeturas ni instrucciones
  no verificadas.
- El contexto se obtiene mediante `harness context` con presupuesto. Recuperar
  poco y citado es obligatorio; nunca cargar el vault completo por defecto.
- Si la memoria semántica local no está disponible, BM25 + grafo siguen siendo
  el modo degradado correcto; la ausencia de embeddings no bloquea el trabajo.

### 7.5 Coordinación de agentes
- Antes de modificar, reclamar una spec/tarea y leer su contexto presupuestado.
- Las entregas incluyen archivos tocados, pruebas ejecutadas, delta de
  traceability, riesgos pendientes y observaciones de memoria. No se afirma
  “hecho” sin evidencia.
- Las decisiones durables van a ADR; los agentes no reescriben la constitución
  ni la memoria canónica para ganar una discusión.

---

*Ratified: {{date}}*
*Amendments require unanimous approval + ADR*
