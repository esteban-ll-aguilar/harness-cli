## ADDED Requirements

### Requirement: Deterministic self-assessment prompt
`harness judge <specId>` SHALL generate a self-assessment prompt covering up to 3
enabled "must" rules and the spec's diff, without calling any external LLM API.

#### Scenario: Judge selects must rules and prints a template
- **WHEN** `harness judge 001` runs on a project with enabled "must" rules
- **THEN** it prints up to 3 of them alongside the spec's diff and the exact
  `harness judge record` command to record a verdict for each

### Requirement: Verdicts are recorded and enforced
`harness judge record <specId> --rule=<id> --verdict=pass|fail|partial` SHALL persist
the verdict; `harness review` SHALL fail on any recorded `fail` verdict and warn on any
judge-selected rule with no recorded verdict.

#### Scenario: Recorded fail blocks the Guardian
- **WHEN** a `fail` verdict is recorded for a rule on a spec
- **THEN** `harness review` for that spec reports FAIL

#### Scenario: Missing verdict warns, never silently passes
- **WHEN** `harness judge` selected a rule but no verdict was ever recorded for it
- **THEN** `harness review` reports WARN "not yet judged" for that rule

#### Scenario: All recorded pass verdicts are clean
- **WHEN** every judge-selected rule for a spec has a recorded `pass` verdict
- **THEN** `harness review`'s judge check reports PASS
