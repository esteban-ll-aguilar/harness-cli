## ADDED Requirements

### Requirement: Symbol lookup over the project's own source
The system SHALL build a regex-based index of function/class/definition symbols over
the project's own source files and let a user look one up by name.

#### Scenario: Finds a function definition
- **WHEN** the project contains `function getUserByEmail(email) { ... }` and the index
  is built
- **THEN** `harness memory symbol getUserByEmail` reports the file and line it's defined at

#### Scenario: Substring lookup returns partial matches
- **WHEN** no symbol exactly matches the query
- **THEN** `harness memory symbol` falls back to substring matches and reports them

#### Scenario: No match found
- **WHEN** no symbol matches the query at all
- **THEN** the command reports no matches cleanly (no error/crash)
