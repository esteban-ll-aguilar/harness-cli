## ADDED Requirements

### Requirement: Traceable SDD-BDD-TDD chain

The harness SHALL derive a traceability report linking every normative requirement in an active
specification to at least one observable BDD scenario and at least one executable TDD test.

#### Scenario: complete requirement is traceable
- **GIVEN** a specification contains `REQ-001` with a normative requirement
- **AND** a scenario and test each declare coverage of `REQ-001`
- **WHEN** an agent runs the traceability report
- **THEN** `REQ-001` is reported as fully covered

#### Scenario: missing test blocks strict progression
- **GIVEN** strict traceability mode is enabled
- **AND** a normative requirement has a scenario but no mapped test
- **WHEN** the lifecycle attempts to complete the Tester stage
- **THEN** the stage is not completed
- **AND** the report identifies the missing test mapping

#### Scenario: explicit exception remains visible
- **GIVEN** a traceability exception has an unexpired reason and owner
- **WHEN** the Guardian evaluates the specification
- **THEN** the result reports a warning with the exception details
- **AND** the exception is not reported as full coverage

### Requirement: Bounded context assembly

The harness SHALL assemble each agent context within the caller's total token budget and SHALL
provide an itemized receipt for included and omitted memory.

#### Scenario: budget pressure omits low-priority memory
- **GIVEN** matching working, episodic and semantic memory exceeds the requested budget
- **WHEN** an agent requests context with that budget
- **THEN** the returned context estimate does not exceed the budget
- **AND** the receipt identifies omitted items and their omission reason

#### Scenario: superseded memory is excluded
- **GIVEN** a newer decision supersedes an older decision
- **WHEN** an agent requests relevant context
- **THEN** the older decision is not returned as current memory

### Requirement: Provenance-aware memory graph

The harness SHALL index memory nodes and relationships with source evidence and SHALL expose
read-only diagnostics for invalid, dangling and stale graph state.

#### Scenario: traceability creates evidence-backed edges
- **GIVEN** a requirement, scenario and test declare the same coverage identifier
- **WHEN** the graph is indexed
- **THEN** the graph contains typed relationships with the source locations as evidence

#### Scenario: health report detects a dangling reference
- **GIVEN** a memory entry references a missing target
- **WHEN** an agent runs the memory health report
- **THEN** the report identifies the dangling reference without modifying memory

### Requirement: Bounded agent handoff

The harness SHALL produce an agent handoff packet containing only the claimed task's contract,
verification requirements and budgeted relevant memory.

#### Scenario: handoff respects task scope
- **GIVEN** two active tasks have different claims and unrelated memory
- **WHEN** an agent requests a handoff for one task
- **THEN** the packet includes its claim, acceptance scenarios and verification command
- **AND** it excludes the unrelated task's private working context

### Requirement: Centralized durable memory stewardship

The harness SHALL route durable-memory promotion through a single Memory Steward role while
allowing every agent to append provenance-bearing observations to an inbox.

#### Scenario: agent observation is promoted by the steward
- **GIVEN** an agent submits an observation with source, scope and evidence
- **WHEN** the Memory Steward processes the inbox
- **THEN** the steward records a promotion or rejection decision
- **AND** no other agent directly modifies durable shared memory

#### Scenario: duplicate observation is rejected
- **GIVEN** an observation has the same normalized claim and source as an existing memory item
- **WHEN** the Memory Steward processes the inbox
- **THEN** it records the observation as duplicate
- **AND** it does not create another durable item

### Requirement: Discoverable agent entry points and command surface

The harness SHALL generate a root agent entry point, an optional `.agents` compatibility
projection and a minimal command surface while retaining documented compatibility aliases.

#### Scenario: agent starts in a generated project
- **GIVEN** a project has been initialized
- **WHEN** a Codex-compatible agent reads repository instructions
- **THEN** root `AGENTS.md` identifies `.harness` as canonical state
- **AND** it directs the agent to the bounded context workflow

#### Scenario: compatibility projection is repaired
- **GIVEN** the `.agents` projection is missing
- **WHEN** the user runs `harness init --repair`
- **THEN** the projection is recreated without replacing canonical `.harness` memory

### Requirement: Deterministic memory and quality evaluation

The harness SHALL evaluate traceability and memory retrieval using versioned local fixtures
without network access or model credentials.

#### Scenario: evaluation detects a stale-memory regression
- **GIVEN** an evaluation fixture contains superseded information
- **WHEN** the memory evaluation runs
- **THEN** it reports the stale-hit metric and the expected pass or fail threshold
