# {{projectName}} — Harness (SDD-BDD-TDD)

> Bienvenido al vault de tu proyecto. Todo el conocimiento del proyecto vive aquí.
> Abre `.harness/` como vault de Obsidian para navegar specs, ADRs y memoria como un grafo.

---

## ¿Qué es esto?

Un sistema multi-agente para desarrollo **Spec-Driven, Behavior-Driven y Test-Driven**.
Seis agentes trabajan en secuencia obligatoria sobre cada feature:

1. 🎙️ **Interviewer** — recolecta requisitos (`harness interview`)
2. 📐 **Architect** — escribe la spec formal (EARS) + plan (`harness spec`)
3. 🧪 **Tester** — genera BDD (`.feature`) y TDD (tests) ANTES de codear (`harness advance`)
4. 💻 **Coder** — implementa (Red → Green → Refactor)
5. 🔍 **Reviewer** — verifica que el código cumpla la spec
6. 🛡️ **Guardian** — gates de calidad (lint, tests, coverage ≥80%) antes de producción

**Regla de oro:** ningún agente avanza una etapa sin antes producir su entregable.
Las omisiones solo se permiten de forma explícita y quedan registradas en `memory/session-logs/`.

---

## Comandos principales

| Comando | Qué hace |
|---------|----------|
| `harness init` | Inicializa el harness en un proyecto |
| `harness interview` | Empezar el relevamiento de requisitos |
| `harness new-change <name>` | Crear una feature nueva (spec/plan/tasks/features/tests) |
| `harness status` | Ver progreso y salud del proyecto |
| `harness advance <id>` | Mover una spec a la siguiente etapa del agente |
| `harness review` | Correr los quality gates del guardian |
| `harness test <id>` | Ejecutar los tests reales de una spec |
| `harness memory search "<tema>"` | Búsqueda BM25 sobre el vault |
| `harness context` | Bundle de contexto optimizado |
| `harness rules` | Ver reglas del proyecto |

**Atajo con IA:** el harness expone `harness-mcp` (servidor MCP) para que cualquier
agente (Claude Code, Codex, OpenCode, Kimi, Qwen, DeepSeek, Cursor) ejecute estos
comandos directamente desde el chat. La configuración está en `.mcp.json`,
`opencode.json` y `.codex/config.toml`.

---

## Flujo diario

```bash
# 1. ¿Nueva idea? Relevá requisitos
harness interview

# 2. Creá el change
harness new-change mi-feature

# 3. Avanzá etapa por etapa (el harness te guía)
harness advance 001

# 4. Verificá estado
harness status
```

---

## Qué vive en cada carpeta

```
.harness/
├── brain/       # Conocimiento persistente (git-tracked)
│   ├── README.md       ← este archivo
│   ├── AGENTS.md       # Instrucciones que lee la IA
│   ├── constitution.md # Reglas inmutables del proyecto
│   ├── north-star.md   # Visión y objetivos
│   ├── decisions/      # ADRs (decisiones de arquitectura)
│   ├── people/         # Stakeholders
│   ├── patterns/       # Patrones de arquitectura
│   └── competencies/   # Estándares del equipo
├── memory/session-logs/ # Bitácoras por sesión (no git-tracked)
├── specs/               # Specs SDD (NNN-feature/)
│   ├── spec.md          # Requisitos en notación EARS
│   ├── plan.md          # Arquitectura técnica
│   ├── tasks.md         # Tareas atómicas
│   ├── features/        # Escenarios BDD (Gherkin)
│   └── tests/           # Tests TDD
├── scripts/             # Scripts de automatización
└── .obsidian/           # Config del vault
```

**Referencias en la raíz del proyecto:** `AGENTS.md` (copia de brain), `.harnessrc`
(configuración), `.obsidian` (symlink al vault).

---

## Buenas prácticas

- **Siempre** arrancá por `harness interview` o `new-change` — nunca codees a ciegas.
- Los **tests se escriben antes que el código** (Red-Green-Refactor).
- Toda decisión no trivial → **ADR** en `brain/decisions/`.
- Mantené `brain/north-star.md` alineado con la visión del producto.
- Si omitís una etapa deliberadamente, `harness advance --to=X` lo deja registrado
  y auditable en `memory/session-logs/`.

---

*Creado con Harness — {{date}}*
*Documentación completa: https://github.com/esteban-ll-aguilar/harness-cli*
