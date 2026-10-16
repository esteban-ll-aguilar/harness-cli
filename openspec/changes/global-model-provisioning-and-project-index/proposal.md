# Proposal: global model provisioning and project indexes

## Why

Semantic memory currently provisions the ONNX model inside each project's `.harness` directory during `harness init`. This duplicates hundreds of megabytes, makes initialization network-dependent, and fails when an AI tool runs from a project that cannot resolve Harness dependencies.

## What changes

- Provision the pinned Transformers.js model once in a user-level Harness cache during package installation.
- Reuse that cache from every project while keeping only corpus-specific semantic indexes under `.harness/.index/semantic/`.
- Make `harness init` deterministic and offline-safe: it creates the vault and BM25/graph index but never downloads a model.
- Add explicit status/provisioning APIs, locking, skip controls, and a postinstall script.
- Update CI, packaging, README, templates, and tests to document and verify the lifecycle.

## In scope

- Node.js global cache resolution with `HARNESS_MODEL_CACHE_DIR` override.
- Postinstall provisioning with graceful fallback when downloads are unavailable.
- Compatibility with local, Claude, Codex, OpenCode, and other callers through the CLI.
- Git hygiene for derived project indexes and legacy local model paths.

## Out of scope

- Cloud vector databases, provider-specific embeddings, or model training.
- Changing canonical Markdown memory or Obsidian vault semantics.

## Success criteria

- A package install attempts model provisioning once in the global cache.
- Two projects share the same model files and lock; no model files are created in either project.
- `harness init --auto` succeeds without network access and reports the global model status.
- Semantic setup/search uses the global model cache and stores only derived index data in the project.
- CI can install and test with `HARNESS_SKIP_MODEL_DOWNLOAD=1`.
- Tests cover cache resolution, status, skip behavior, and package contents.
