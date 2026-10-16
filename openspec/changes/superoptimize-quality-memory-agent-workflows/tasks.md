## 0. Baseline and contracts

- [ ] 0.1 Add baseline fixtures for a legacy spec, complete traceable spec, stale decision and
      budget pressure case in `tests/runner.js` fixtures; record current retrieval/gate behavior.
- [x] 0.2 Define additive `.harnessrc.quality` defaults (`traceabilityMode: warn`,
      `contextBudgetTokens: 1200`) in `init.js` and read-time fallbacks in consumers.
- [ ] 0.3 Extend the project templates with requirement IDs, `@covers` examples, provenance
      frontmatter and an agent completion receipt template.
- [ ] 0.4 Tests: legacy `.harnessrc` and templates remain usable without new fields.

## 1. Make SDD → BDD → TDD mechanically traceable

- [x] 1.1 Create `src/utils/traceability.js` to parse normative requirement IDs, Gherkin
      `@covers:` tags and test coverage comments without language-specific dependencies.
- [x] 1.2 Add `harness trace <specId>` with a compact coverage matrix and machine-readable
      `--json` output.
- [ ] 1.3 Add Tester and Coder lifecycle checks in `advance.js`, initially warning by default
      and strict when `quality.traceabilityMode` is `strict`.
- [ ] 1.4 Add expiring, reasoned traceability overrides and Guardian reporting; never treat an
      override as a pass.
- [ ] 1.5 Tests: happy path, missing scenario, missing test, test failure, valid override,
      expired override and backward compatibility.

## 2. Budgeted context controller

- [x] 2.1 Extract a `ContextBudget` allocator from `tokenOptimizer.js`, with tier caps,
      deterministic admission and no cross-tier overflow.
- [ ] 2.2 Make `getAlwaysContext` section-aware and capped; emit locators for omitted material.
- [ ] 2.3 Add a context receipt to `harness context` (`--budget=N`, `--receipt=json|text`) and
      a `context-built` ledger event without storing prompt body.
- [ ] 2.4 Ensure graph traversal respects validity, provenance confidence and budget before
      neighbor expansion; preserve BM25 fallback.
- [ ] 2.5 Tests: total budget compliance, priority ordering, stale-node exclusion, fallback,
      deterministic result ordering and receipt correctness.

## 3. Provenance graph and memory operations

- [ ] 3.1 Extend `graphIndex.js` to parse optional provenance frontmatter and produce typed,
      evidence-backed edges for `implements` and `verifies`.
- [ ] 3.2 Add stable node/edge IDs and index-version migration; retain inference for legacy
      Markdown and invalid frontmatter warnings.
- [x] 3.3 Add `harness memory health` as a read-only health report.
- [ ] 3.4 Add `harness memory eval` with versioned deterministic fixture corpus and metrics:
      recall@k, stale-hit rate, budget compliance, dangling-edge count and traceability coverage.
- [ ] 3.5 Tests: typed edge construction, stale/superseded edge behavior, health findings and
      fixed evaluation metric outputs.

## 3.6 Local semantic long-term memory

- [x] 3.6.1 Add the Node-local Transformers.js dependency and an embedding provider configured
      for the pinned multilingual ONNX model; no API key or service is permitted.
- [x] 3.6.2 Implement a file-backed incremental vector index under `.harness/.index/semantic/`
      with chunk/source provenance, cosine ranking, model manifest and fingerprint rebuild.
- [x] 3.6.3 Make `harness init` provision the local model/index by default, with explicit
      `--no-semantic-memory` escape hatch and clear degraded-mode diagnostics.
- [x] 3.6.4 Fuse vector, BM25 and graph ranking in the bounded context controller; retrieval
      remains deterministic and excludes superseded knowledge.
- [ ] 3.6.5 Tests: manifest compatibility, incremental rebuild, Spanish semantic retrieval,
      offline operation after provisioning, and BM25+graph fallback.

## 4. Safe multi-agent handoffs

- [ ] 4.1 Add `harness handoff <specId> [--task=<id>] [--budget=N]`, built solely from the
      traceability report, claim state and budgeted context receipt.
- [ ] 4.2 Extend claims with optional task ownership and collision detection while retaining
      existing spec-level claim behavior.
- [ ] 4.3 Add completion receipt validation: touched files, tests run, traceability delta,
      unresolved risks and memory observations are structured rather than free-form only.
- [ ] 4.4 Tests: handoff omits unrelated memory, respects budget, detects task claim conflicts
      and validates an incomplete receipt as non-complete.

## 4.5. Memory Steward and generated-project compatibility

- [x] 4.5.1 Add the built-in `memory-steward` role, structured observation inbox and
      deterministic promotion/rejection processing with provenance checks.
- [x] 4.5.2 Update `harness init` to generate/repair the root `AGENTS.md` entry point and a
      `.agents/` compatibility projection without duplicating canonical memory.
- [ ] 4.5.3 Consolidate the documented command/MCP surface into `init`, `work`, `memory`,
      `quality`, `context` and `status`; retain hidden compatibility aliases with tests.
- [ ] 4.5.4 Tests: only the steward promotes durable memory, duplicate observations are safe,
      repair is non-destructive, and compatibility aliases route correctly.

## 5. CI, rollout and decision point

- [ ] 5.1 Add `harness quality report` to summarize gates, traceability, eval metrics,
      overrides and memory health in CI-friendly text/JSON.
- [ ] 5.2 Document migration, warning→strict rollout, privacy/retention behavior, and agent
      operating protocol in README and AGENTS templates.
- [ ] 5.3 Run full tests, smoke tests for every new CLI/MCP route, OpenSpec validation and a
      measured before/after report from the fixture corpus.
- [ ] 5.4 Write an ADR deciding whether the optional embeddings/community-summary adapter is
      justified by measured recall gains relative to cost/complexity; do not implement it unless
      the evidence clears agreed thresholds.

## Parallelization plan

After section 0, sections 1 and 2 may proceed in parallel if agents do not overlap
`advance.js`/`tokenOptimizer.js`. Section 3 depends on the contracts from sections 1–2.
Section 4 depends on 1–2. Section 5 follows all preceding sections.
