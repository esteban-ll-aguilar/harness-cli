## Architecture

```
.harnessrc quality.gates ──> Guardian review ──> gate receipts
                                      │
harness quality release ──> release verifier ──> .harness/reports/release/
                                      │
                                      └──> quality snapshot trend (metadata only)
```

`quality.gates` is additive. Each gate has `{ name, command, required }`; commands are executed
with a bounded timeout and an inherited project working directory. Existing configurations retain
the current behavior when no gates are configured. An optional coverage command must report a
numeric percentage and may declare `minimum`.

The release verifier calls local commands directly, records exact exit status and creates:

- `sbom.json`: package name/version and resolved production dependency integrity metadata from
  `package-lock.json`.
- `integrity.json`: SHA-512 for the generated tarball plus source revision where available.
- `release-report.json`: only command outcomes and paths; never prompts, vault document text or
  secrets.

Snapshots are append-only JSON under `.harness/reports/quality/`, capped to the latest 50 entries.
`harness quality trend` compares the newest snapshot to the prior one.

## Decisions

- Shell commands are a project-owner contract. They are not inferred from prose or executed from
  an agent response.
- The SBOM is a dependency inventory, not a cryptographic signature. Signing remains a release
  owner responsibility because it needs an external/private key.
- The release command is intentionally local and explicit; CI invokes it rather than duplicating
  its checks.
