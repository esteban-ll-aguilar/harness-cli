# ADR-004: Local semantic memory remains an optional retrieval layer

## Status

Accepted — 2026-10-16

## Context

The harness needs long-term memory across Codex, Claude, OpenCode and other
hosts without a service, API key, Docker daemon or provider-specific memory.
BM25 plus provenance graph is deterministic and always available. Local
embeddings may improve wording/Spanish synonym retrieval, but add a model
download, disk use and runtime cost.

## Decision

Keep Markdown, specs and ADRs as canonical Git-tracked memory. Keep BM25 +
provenance graph as the mandatory, offline baseline. Use local Transformers.js
embeddings only as an optional, derived index whose model is provisioned once by npm
postinstall into a user-level cache.
The system must fall back to the baseline on provisioning/index/query failure.

Promotion of a community-summary or external-vector adapter requires a versioned
evaluation corpus showing higher recall@k without stale-hit or budget regression,
plus an ADR explaining privacy, operational cost and rollback.

## Consequences

- Works in every supported agent host and offline after provisioning.
- No cloud vector database becomes a production dependency.
- Semantic retrieval is measured rather than assumed; it can be disabled with
  `--no-semantic-memory`.
