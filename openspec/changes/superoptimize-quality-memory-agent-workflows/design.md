## Context and evidence

The existing implementation already has the right inexpensive building blocks: BM25 fallback,
section-level graph retrieval, validity windows via `supersedes`, session-log compaction, and
an external-agent Guardian. The missing layer is policy: explicit artifact traceability,
total-context budgeting, provenance, and objective evaluation.

This design follows virtual context management: retain durable state outside the prompt and
load only a bounded working set. It also adopts GraphRAG's useful distinction between local
graph retrieval and higher-level summaries, but does **not** copy its costly LLM entity
extraction/community detection. Sources consulted 2026-10-15:

- MemGPT proposes hierarchical virtual context management for information beyond a context
  window: https://arxiv.org/abs/2310.08560
- Microsoft GraphRAG documents hierarchical communities and multilevel summaries:
  https://microsoft.github.io/graphrag/index/overview/
- Letta documents persistent, bounded memory blocks reserved for context-critical state:
  https://docs.letta.com/v1-sdk/memory/memory-blocks

## Architecture

```
SDD requirement (stable ID) ─implements?─> BDD scenario ─verified-by─> TDD test
       │                                               │
       └──────────── traceability manifest ────────────┘
                           │ blocks / warns
                           ▼
                  Lifecycle + quality ledger

brain/specs/session logs ─> provenance graph ─> budget controller ─> handoff/context packet
                                   │                    │
                                   └── health/eval ──────┘
```

### 1. Traceability and lifecycle policy

`spec.md` requirements receive stable IDs (`REQ-001`, etc.). A `.feature` scenario carries a
`@covers:REQ-001` tag and an executable test carries a language-neutral `@covers:REQ-001`
comment (or equivalent metadata). A new `traceability.js` parses these into:

```js
{
  requirements: [{ id, strength: 'must', source }],
  scenarios: [{ id, covers: ['REQ-001'], source }],
  tests: [{ name, covers: ['REQ-001'], source }],
  gaps: [{ requirementId, missing: 'scenario' | 'test' }]
}
```

The Tester gate requires a scenario and test mapping for every normative requirement. The Coder
gate invokes the configured test runner and requires success for mapped tests. Overrides are
allowed only through a dedicated command that records actor, reason, expiry and scope in
`.harnessrc`; `review` reports an unexpired override as WARN and an expired one as FAIL.

### 2. Memory tiers and total budget

The controller receives `--budget=<tokens>` (default 1200) and allocates a fixed envelope:

| Tier | Default cap | Contents | Admission |
|---|---:|---|---|
| Working | 250 | concise project state, active spec, immutable rules index | pinned, trimmed by section |
| Episodic | 200 | current task/claim and recent non-superseded events | newest + relevant |
| Semantic | 600 | graph/BM25 sections, decisions, patterns, specs | score × confidence × freshness |
| Reserve | 150 | direct dependencies of selected nodes | only if capacity remains |

The controller first chooses the working tier, then ranks graph nodes, applies relation-aware
expansion, and emits a receipt (`included`, `omitted`, `reason`, `source`, `estimatedTokens`).
No tier may borrow from another without recording it in the receipt. If requested artifacts
cannot fit, the response is a compact index/locator rather than a truncated blob.

### 3. Provenance graph and graph health

Markdown frontmatter gains optional additive fields: `id`, `kind`, `created_at`, `updated_at`,
`confidence`, `supersedes`, `implements`, `verifies`, `owner`, and `retention`. Existing files
remain valid with inferred metadata. Existing wikilinks become `references`; traceability creates
`implements`/`verifies` edges. The index records evidence locations for every edge.

`harness memory health` reports dangling edges, ambiguous IDs, stale sessions, orphaned active
specs, expired overrides, superseded nodes still referenced, index age and token-pressure rate.
It is diagnostic and never changes data. `harness memory eval` runs versioned fixtures and
calculates recall@k, stale-hit rate, budget compliance and traceability coverage.

### 4. Agent coordination

`harness handoff <spec> [--task=<id>]` emits a bounded packet: objective, owned files/claim,
contract, acceptance scenarios, commands, relevant memories, known risks and a completion
receipt schema. Claims gain optional task scope while preserving current spec claims for older
projects. Agents do not write global memories directly; they write a structured session event,
which the deterministic compactor/promoter can propose for review.

#### Memory Steward

The roster gains a built-in `memory-steward` specialist. Every other agent may emit an
append-only observation into `memory/inbox/`; only the steward consumes that inbox and writes
durable `brain/decisions`, `brain/patterns`, or structured digests. It rejects malformed,
duplicate, expired or unsupported claims and records the result as a ledger event. This single
writer rule prevents concurrent agents from overwriting shared memory while preserving a full
audit trail. The steward does not invent facts or call an LLM; promotion requires explicit
provenance and a configured human/guardian approval where appropriate.

#### Discoverable generated-project layout

`AGENTS.md` at the project root is the canonical automatic entry point. It directs agents to
call `harness context`/`harness work` and describes the source-of-truth map. `.harness/` owns
all state, specs and durable knowledge. `.agents/` is a compatibility projection containing a
small `README.md`, an `AGENTS.md` pointer and links/copies of agent role definitions; it is not
a second state store. `harness init` and `harness sync` recreate projections deterministically.

#### Minimal command surface

The supported top-level commands become `init`, `work`, `memory`, `quality`, `context`,
`status`, and `help`. `work` contains change/interview/advance/handoff; `quality` contains
test/review/gate/judge/trace. Former top-level verbs remain hidden compatibility aliases for at
least one minor release. MCP receives a similarly small set of composite tools; `init` is always
available and idempotently repairs the layout.

### 5. Quality ledger and observability

Append-only events under `memory/session-logs/` record `gate-evaluated`, `gate-override`,
`context-built`, `handoff-created`, and `memory-eval`. A compact `quality-report` combines
traceability coverage, tests, override debt, memory budget compliance and health findings.
All metrics are locally reproducible, contain no prompt contents by default, and are suitable for
CI snapshots.

## Decisions and trade-offs

- **Deterministic first:** BM25 + graph structure is auditable and zero-dependency. Embeddings
  are an optional adapter only after benchmark evidence shows value for a target corpus.
- **Do not permanently pin full documents:** pinned memory stores tiny indexes/current state;
  source documents remain retrievable by provenance link.
- **Conservative promotion:** a session observation stays episodic until a human-approved ADR,
  spec, pattern, or explicit promotion rule makes it durable.
- **Receipt over opacity:** exact tokenization differs by model, so estimates are labeled; the
  hard character-derived cap still prevents unbounded prompt growth.
- **One writer, many observers:** centralization applies to durable memory only. Agents retain
  task-local notes and emit append-only observations, so the Memory Steward cannot become a
  bottleneck for implementation work.

## Compatibility and migration

All `.harnessrc` and frontmatter fields are optional. Legacy specs lacking IDs remain readable
but report `legacy-unmapped` WARN until migrated. Initial rollout keeps lifecycle enforcement in
warning mode; strict mode is opt-in per project and becomes the default only after evaluation
fixtures and migration tooling are stable.
