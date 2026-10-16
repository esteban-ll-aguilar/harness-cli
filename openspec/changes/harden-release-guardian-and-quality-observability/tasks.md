## 0. Contracts and configuration

- [x] 0.1 Add additive quality-gate defaults and gate command validation to init/config consumers.
- [x] 0.2 Add tests for legacy configuration and mandatory/optional gate behavior.

## 1. Executable Guardian gates

- [x] 1.1 Implement bounded command execution and structured gate receipts.
- [x] 1.2 Execute configured lint/typecheck/build/coverage/security gates in Guardian review.
- [x] 1.3 Test passing, failing, missing mandatory and optional commands.

## 2. Release and supply-chain evidence

- [x] 2.1 Implement deterministic local SBOM/integrity/release report generation.
- [x] 2.2 Add `harness quality release` and `npm run release:check`.
- [x] 2.3 Update CI to consume the unified release check.
- [x] 2.4 Test artifact integrity and failure propagation without network access.

## 3. Local quality observability

- [x] 3.1 Persist bounded content-free quality snapshots and add `harness quality trend`.
- [x] 3.2 Test retention and trend deltas.

## 4. Documentation and verification

- [x] 4.1 Update README/templates for gates, release evidence and operating procedure.
- [x] 4.2 Run full tests, smoke, audit, OpenSpec validation and release check.

## Parallelization plan

Sections 1 and 3 can proceed after 0 without touching the same files. Section 2 depends on the
gate executor; section 4 follows all implementation.
