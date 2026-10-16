## ADDED Requirements

### Requirement: Global model cache
Harness SHALL store the semantic model in a user-level cache shared by all projects, with an environment override for controlled deployments.

#### Scenario: Two projects share model artifacts
- **WHEN** semantic setup runs for two different Harness projects on the same machine
- **THEN** both operations resolve the same global cache directory and no model files are created under either project

#### Scenario: Custom cache is configured
- **WHEN** `HARNESS_MODEL_CACHE_DIR` is set
- **THEN** all provisioning and embedding operations use that directory

### Requirement: Install-time provisioning
The npm package SHALL attempt to provision the pinned model from its postinstall script and SHALL support an explicit skip flag for CI or restricted environments.

#### Scenario: Normal package install
- **WHEN** the package is installed with scripts enabled and the model is not ready
- **THEN** postinstall attempts one global model download and records readiness after success

#### Scenario: Restricted install
- **WHEN** `HARNESS_SKIP_MODEL_DOWNLOAD=1`
- **THEN** postinstall skips network/model work, exits successfully, and reports the retry command

### Requirement: Offline initialization
`harness init` SHALL not download or provision the semantic model and SHALL leave BM25 and graph retrieval usable without network access.

#### Scenario: New project initialization offline
- **WHEN** `harness init --auto` runs without network access
- **THEN** project initialization succeeds without `.harness/.models` model artifacts and reports semantic setup as a separate operation

### Requirement: Derived project indexes
Semantic vectors SHALL remain project-specific, rebuildable artifacts under `.harness/.index/semantic/`, and SHALL use the global model cache.

#### Scenario: Project corpus changes
- **WHEN** a tracked Markdown memory document changes and semantic setup is run
- **THEN** only the affected project index entries are rebuilt against the shared model
