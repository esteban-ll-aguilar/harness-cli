## ADDED Requirements

### Requirement: Old session logs are archived into a digest
`harness memory compact [--days=N]` SHALL move session logs older than N days
(default 30) out of the indexed corpus into an on-disk archive, and write one digest
Markdown file summarizing what was archived.

#### Scenario: Old logs are archived and digested
- **WHEN** `harness memory compact --days=30` runs and session logs exist that are
  older than 30 days
- **THEN** those logs are moved to `.harness/.archive/session-logs/` and a digest file
  is written to `memory/session-logs/`

#### Scenario: Recent logs are left untouched
- **WHEN** a session log is newer than the threshold
- **THEN** compaction leaves it in place

#### Scenario: Compaction is idempotent
- **WHEN** `harness memory compact` runs a second time with nothing newly eligible
- **THEN** it reports that there is nothing to compact and makes no changes

### Requirement: Archived logs are excluded from search
Archived logs SHALL NOT be part of the corpus `harness memory search` indexes.

#### Scenario: Rebuilt index excludes archived logs
- **WHEN** the BM25 index is rebuilt after a compaction
- **THEN** the archived files under `.harness/.archive/` do not appear among the indexed
  documents
