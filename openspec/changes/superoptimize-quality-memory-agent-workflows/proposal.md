## Why

The current harness has valuable primitives (EARS specs, Gherkin placeholders, TDD stubs,
approval gates, BM25, a section graph, compaction, symbol lookup and claims), but it cannot
prove the SDD → BDD → TDD chain is complete. `advance` can mark a stage done before its
required artifact is executable, and `context` can exceed its effective budget because the
always-loaded files and spec artifacts are unbounded. The graph is useful but has no
provenance, health diagnostics, or retrieval evaluation, so long-lived projects cannot tell
whether memory helps or distracts agents.

## What Changes

- Add a deterministic **traceability gate**: EARS requirement IDs ↔ Gherkin scenarios ↔ test
  IDs. The Tester stage cannot complete until every MUST/SHALL requirement has an observable
  scenario and a mapped test; the Coder stage cannot complete until the mapped tests pass.
- Replace the current implicit context construction with a **budgeted memory controller**:
  small pinned working memory, recent episodic state, and durable semantic/graph retrieval.
  Each emitted item includes source, timestamp, confidence and token cost; low-value items are
  omitted rather than overflowing the model context.
- Evolve the existing section graph into a **provenance graph** with typed relations
  (`implements`, `verifies`, `decides`, `supersedes`, `references`) and deterministic graph
  health reports. It remains file-backed and zero-dependency; no embeddings, database or LLM
  extraction is introduced.
- Add a **quality ledger and evaluation suite** that records gate outcomes, retrieval budgets,
  omissions and overrides. Synthetic fixtures make regressions in recall, stale-memory
  suppression and workflow traceability detectable in CI.
- Add explicit agent handoff packets and claims scoped to a spec/task so parallel agents receive
  only their contract, relevant memory and verification command.
- Add a **Memory Steward** specialist. It is the sole writer of durable memory and receives
  structured observations from other agents; it validates provenance, deduplicates, expires or
  promotes items, and publishes a bounded memory digest. Sub-agents never mutate shared durable
  memory directly.
- Simplify the public interface around `harness init`, `harness work`, `harness memory` and
  `harness quality`. Existing commands remain compatibility aliases during migration, but help
  and MCP expose only the minimal primary workflow.
- Make the generated-project architecture explicit: root `AGENTS.md` is the automatic entry
  point for Codex-compatible agents, `.harness/` is the canonical data store, and `.agents/` is
  a generated compatibility projection for tools that conventionally scan that folder.

## Delivery Plan

1. **Foundation (short term):** baseline metrics, traceability manifest/parser, hard lifecycle
   gates, handoff packet, and tests.
2. **Reliable memory (short term):** token-budget controller, provenance metadata, graph health
   report, deterministic retrieval evaluation and migration of `harness context`.
3. **Scale (medium term):** incremental graph updates, task-level claims, retention policies,
   relevance feedback, and CI quality trend reporting.
4. **Long term, opt-in research track:** pluggable semantic embeddings and community summaries
   behind an adapter and measured against the deterministic baseline; never make an external
   service a requirement for core workflows.

## Success Criteria

- A spec cannot cross Tester/Coder gates with missing SDD→BDD→TDD evidence, unless an explicit,
  persisted override states the reason.
- `harness context` honors a requested total token budget and explains every included/omitted
  memory item.
- A changed or superseded decision cannot be returned as current memory.
- CI can run deterministic quality and memory-evaluation fixtures without credentials or network.
- A generated project has one documented source of truth per kind of information and no agent
  needs to infer whether `.agents` or `.harness` is authoritative.

## Non-goals

- No autonomous LLM calls, vector database, cloud service, new runtime dependency, or hidden
  background process.
- No claim that the graph is a full enterprise GraphRAG system; large-scale semantic/community
  indexing is opt-in and must beat the baseline in evaluation first.
- No silent deletion of raw memory or automatic human approval.
