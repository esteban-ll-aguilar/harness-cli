## ADDED Requirements

### Requirement: Executable Guardian quality gates

The harness SHALL execute each configured quality gate and SHALL block Guardian when a required
gate fails, times out, or cannot be run.

#### Scenario: mandatory lint fails
- **GIVEN** a project configures a required lint command
- **WHEN** Guardian runs the command and it exits non-zero
- **THEN** Guardian reports the gate as failed and blocks approval

#### Scenario: optional coverage tool is unavailable
- **GIVEN** a project configures a non-required coverage command
- **WHEN** the command cannot be run
- **THEN** Guardian reports a warning without treating it as a successful coverage result

### Requirement: Deterministic release verification

The harness SHALL provide one local release check that verifies tests, audit, package creation and
release evidence, and SHALL fail when any required check fails.

#### Scenario: release artifact has integrity evidence
- **WHEN** a release check succeeds
- **THEN** it writes an integrity report containing the package SHA-512 and an SBOM derived from
  the locked dependency graph

### Requirement: Local quality trends

The harness SHALL retain bounded content-free quality snapshots and SHALL report the delta between
the newest and preceding snapshot.

#### Scenario: snapshot retention is bounded
- **GIVEN** more than the configured number of snapshots exist
- **WHEN** a new quality report is persisted
- **THEN** only the newest configured number remains
