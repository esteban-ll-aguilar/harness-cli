## ADDED Requirements

### Requirement: Optional glob scope on a rule
A project rule SHALL support an optional `glob` field. When present, the rule applies
only to files matching the glob; when absent, the rule MUST apply to every file
(unchanged default behavior).

#### Scenario: Rule created without a glob applies everywhere
- **WHEN** a rule is added via `harness rules add` without `--glob`
- **THEN** `rulesForFile` returns that rule for any file path

#### Scenario: Rule created with a glob applies only to matching files
- **WHEN** a rule is added via `harness rules add "..." --glob="src/pages/**"`
- **THEN** `rulesForFile` returns that rule for `src/pages/x.tsx` and omits it for `src/api/y.ts`

### Requirement: Scoped rule lookup for a given file
The system SHALL provide a way to list which rules apply to a specific file path, for
use by `harness context --for-file=<path>`.

#### Scenario: Context command shows scoped rules
- **WHEN** `harness context --for-file=src/pages/list.tsx` runs in a project with one scoped
  rule (`glob=src/pages/**`) and one unscoped rule
- **THEN** the output includes the unscoped rule and includes the scoped rule (since it matches)

#### Scenario: Context command excludes non-matching scoped rules
- **WHEN** `harness context --for-file=src/api/list.ts` runs in the same project
- **THEN** the output includes the unscoped rule but excludes the rule scoped to `src/pages/**`
