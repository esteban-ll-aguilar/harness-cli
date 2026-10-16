# Design

## Architecture

```text
npm install Harness
        |
        v
scripts/postinstall.js --(once)--> ~/.cache/harness/models/<model>
                                      (shared ONNX artifacts)

project/.harness Markdown --> harness memory semantic setup
                              --> project/.harness/.index/semantic/index.json
                              --> global model cache (read-only reuse)
```

Canonical memory remains Git-tracked Markdown. The project semantic index and BM25 index are rebuildable artifacts. The global model is machine state, not project knowledge, and is never copied into a repository.

## Public contracts

- `getGlobalModelCacheDir()` returns `HARNESS_MODEL_CACHE_DIR` when set, otherwise the platform cache directory.
- `getModelStatus({ model, cacheDir })` returns `{ ready, model, cacheDir, marker }` without downloading.
- `provisionSemanticModel({ model, cacheDir, allowRemote })` downloads/warms the model once and writes a marker after success.
- `embedTexts(harnessDir, texts, options)` defaults to the global cache and uses a global lock.

## Bootstrap and failure policy

The postinstall script attempts provisioning unless `HARNESS_SKIP_MODEL_DOWNLOAD=1`. A failed download prints an actionable warning and exits successfully because BM25 and graph retrieval remain available. Explicit semantic setup can retry later. CI sets the skip variable to avoid network-heavy installs.

`harness init` does not call semantic embedding. It reports that semantic setup can be run later and points to the global cache status. `harness memory semantic setup` remains the explicit project-index build operation.

## Decisions and trade-offs

- A user-level filesystem cache avoids duplicate model storage while remaining provider-agnostic and offline-capable after first install.
- Project-local indexes are necessary because each project's corpus differs; sharing them would leak context and create invalid fingerprints.
- A marker file makes readiness inspectable without scanning provider-specific cache layouts.
- A lock file prevents concurrent npm installs or agent sessions from corrupting the shared cache.
