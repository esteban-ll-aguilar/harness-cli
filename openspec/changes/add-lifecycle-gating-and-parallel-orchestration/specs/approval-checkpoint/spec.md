## ADDED Requirements

### Requirement: Configured stages require explicit human approval
For every stage listed in `.harnessrc.quality.approvalGates` (default `['architect']`
when the key is absent), `harness advance` SHALL refuse to mark that stage done until
`harness gate approve <specId> --stage=<stage>` has been run for it.

#### Scenario: Advance blocked pending approval
- **WHEN** `harness advance 001` would mark the `architect` stage done and no approval
  is recorded for it
- **THEN** the command blocks with a message pointing to `harness gate approve 001
  --stage=architect`, and the stage stays not-done

#### Scenario: Approval unblocks the advance
- **WHEN** `harness gate approve 001 --stage=architect` has been run
- **THEN** a subsequent `harness advance 001` marks `architect` done

### Requirement: Approving is idempotent
Re-approving an already-approved stage SHALL succeed as a no-op: it does not create a
duplicate log entry and exits successfully.

#### Scenario: Double approval is a no-op
- **WHEN** `harness gate approve 001 --stage=architect` is run twice in a row
- **THEN** both invocations exit 0, the second reports it was already approved, and only
  one approval log entry exists in `memory/session-logs/`
