# Tasks

## 0. Contracts and packaging

- [x] 0.1 Define global cache, marker, lock, status, and provisioning contracts.
- [x] 0.2 Add the postinstall entrypoint and include it in the npm tarball.

## 1. Semantic runtime

- [x] 1.1 Move model cache and lock resolution from project `.harness` to the global cache.
- [x] 1.2 Add model status and successful-provision marker handling.
- [x] 1.3 Preserve project-local semantic index generation with the global model.

## 2. Initialization and CI

- [x] 2.1 Remove model provisioning from `harness init` and repair mode.
- [x] 2.2 Report global model readiness and keep BM25/graph initialization available offline.
- [x] 2.3 Make CI and release workflows skip postinstall downloads explicitly.

## 3. Quality and documentation

- [x] 3.1 Add adversarial tests for cache sharing, skip behavior, and package contents.
- [x] 3.2 Update README, templates, and ADR wording for global model lifecycle.
- [x] 3.3 Run strict OpenSpec validation, test suite, smoke, release check, and package dry run.

## Parallelization plan

Tasks 1.1–1.3 are sequential because the public semantic runtime contract is shared. Tasks 2 and 3 can follow runtime completion; documentation and tests may be developed in parallel only when they do not modify the same file.
