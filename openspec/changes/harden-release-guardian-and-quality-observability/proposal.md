## Why

The Guardian currently describes lint, build, coverage and security work but does not execute a
single, explicit project-configured quality contract. Release evidence is spread across commands,
and consumers cannot attest which dependency graph or package artifact was verified.

## What Changes

- Add an additive `quality.gates` contract for lint, typecheck, build, coverage and security.
  Guardian executes configured commands and fails only mandatory failed/unrunnable gates.
- Add `harness quality release` and `npm run release:check` for one deterministic local release
  verification, including tests, audit, package contents and OpenSpec validation.
- Emit a local CycloneDX-style SBOM, integrity manifest and package SHA-512; no service, upload
  or signing key is required.
- Persist bounded, content-free quality snapshots and provide a local trend report.
- Update CI, templates and README. No ONNX integration test or new model is added.

## Success Criteria

- A configured mandatory quality gate SHALL block Guardian on failure or missing command.
- Release check SHALL fail if any required verification or package artifact check fails.
- Every generated release evidence file SHALL be deterministic enough to audit locally and shall
  not contain agent prompts or vault contents.
- A project can inspect quality trend deltas without external storage.

## Non-goals

- No remote registry, telemetry, cloud signing, SBOM upload, or model integration test.
- No mandatory coverage threshold for legacy projects unless explicitly configured.
