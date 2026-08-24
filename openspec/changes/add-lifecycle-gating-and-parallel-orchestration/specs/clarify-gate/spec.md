## ADDED Requirements

### Requirement: Ambiguity check before Tester starts
When `harness advance <specId>` is about to move a spec from `architect` (done) into
`tester` (done), the system SHALL run the ambiguity checker against that spec's
`spec.md` and block the transition if unresolved ambiguities are found, unless `--force`
is passed.

#### Scenario: Advance blocked on unresolved ambiguities
- **WHEN** `harness advance 001` runs and `spec.md` has no mention of performance,
  error handling, security, or scale
- **THEN** the command reports the missing areas and does not mark `tester` as done

#### Scenario: Advance proceeds with --force and logs the override
- **WHEN** `harness advance 001 --force` runs under the same conditions
- **THEN** `tester` is marked done and an `ambiguity-override` entry is appended to
  `memory/session-logs/`

#### Scenario: Advance proceeds normally when spec.md is unambiguous
- **WHEN** `spec.md` mentions performance, error handling, security and scale
- **THEN** `harness advance 001` marks `tester` done without requiring `--force`

### Requirement: Standalone clarify command
The system SHALL provide `harness gate clarify <specId>` to run the ambiguity checker against
a spec's `spec.md` on demand, without mutating any state.

#### Scenario: Clarify reports findings without side effects
- **WHEN** `harness gate clarify 001` runs
- **THEN** it prints the same findings the advance gate would, and the spec's stage
  state in `.harnessrc` is unchanged
