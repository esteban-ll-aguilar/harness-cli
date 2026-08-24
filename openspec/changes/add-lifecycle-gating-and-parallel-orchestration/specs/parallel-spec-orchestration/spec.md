## ADDED Requirements

### Requirement: Claim protocol prevents two sessions working the same spec
`harness orchestrate claim <specId>` SHALL let an agent session reserve a spec so a
second, independent session working the same project does not duplicate its work.

#### Scenario: Claiming a free spec succeeds
- **WHEN** `harness orchestrate claim 001` runs and spec 001 has no current claim
- **THEN** the spec is marked claimed by the caller with a timestamp

#### Scenario: Re-claiming your own claim is idempotent
- **WHEN** the same owner runs `harness orchestrate claim 001` again while already
  holding the claim
- **THEN** the command succeeds as a no-op (same claim, no error)

#### Scenario: Claiming a spec another session actively holds is refused
- **WHEN** `harness orchestrate claim 001` runs and spec 001 is claimed by a different
  owner within the staleness window
- **THEN** the command refuses and reports who holds the claim and since when

#### Scenario: A stale claim can be taken over
- **WHEN** `harness orchestrate claim 001` runs and the existing claim is older than the
  staleness threshold
- **THEN** the command takes over the claim and logs that it stole a stale claim

### Requirement: Releasing a claim is idempotent
`harness orchestrate release <specId>` SHALL succeed whether or not the spec is
currently claimed.

#### Scenario: Releasing an unclaimed spec is a no-op
- **WHEN** `harness orchestrate release 001` runs and spec 001 has no claim
- **THEN** the command succeeds without error

### Requirement: Status view for dispatching parallel work
`harness orchestrate status` SHALL list every active spec with its current stage and
claim owner (or "free"), so an external orchestrator can pick unclaimed specs to
dispatch to separate agent sessions.

#### Scenario: Status lists claimed and free specs
- **WHEN** the project has one claimed and one free active spec
- **THEN** `harness orchestrate status` shows both, with the claimed one's owner and the
  free one marked "free"
