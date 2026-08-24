## ADDED Requirements

### Requirement: Guardian warns on files touched outside a spec's tasks
When `harness review` runs against a spec that has a non-empty `tasks.md` with at least
one extractable file path, the Guardian SHALL compare the files changed in the working
tree against the file paths referenced in `tasks.md` and report a WARN listing any
changed file that isn't referenced.

#### Scenario: Unexpected file flagged
- **WHEN** the working tree has changes to a file never mentioned in the spec's tasks.md
- **THEN** `harness review` prints a WARN naming that file

#### Scenario: All changes covered
- **WHEN** every changed file is referenced somewhere in tasks.md
- **THEN** the drift check reports PASS with no unexpected files listed

#### Scenario: Not a git repository
- **WHEN** the project is not a git repository or `git` is unavailable
- **THEN** the drift check reports WARN "not checkable" instead of failing the review
