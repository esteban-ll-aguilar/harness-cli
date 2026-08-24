## ADDED Requirements

### Requirement: Atomic .harnessrc mutation
The system SHALL provide a locked read-modify-write primitive for `.harnessrc` so that
concurrent callers on the same machine cannot silently lose each other's writes.

#### Scenario: A held lock blocks a second concurrent acquisition
- **WHEN** one caller holds the `.harnessrc` lock
- **THEN** a second caller's acquisition attempt waits (retries) instead of proceeding
  and corrupting the read-modify-write

#### Scenario: A stale lock is recovered
- **WHEN** a lock directory exists but its modification time is older than the staleness
  threshold (indicating a crashed holder)
- **THEN** a new caller force-removes it and successfully acquires the lock instead of
  blocking forever

#### Scenario: Sequential acquisitions both succeed
- **WHEN** two lock acquisitions happen one after the other (no overlap)
- **THEN** both succeed and both mutations are reflected in `.harnessrc`
