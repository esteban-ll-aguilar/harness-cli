# BDD Guide — Behavior-Driven Development

> **Behavior first, code second.** If you can't describe the behavior, you can't implement it.

---

## What is BDD?

Behavior-Driven Development (BDD) is a methodology where you define **executable specifications of behavior** using natural language that all stakeholders understand.

```
Spec (SDD) → BDD Scenarios → Executable Tests → Code → Passing Tests
```

## Gherkin Syntax

BDD uses Gherkin, a business-readable domain-specific language.

### Keywords

| Keyword | Purpose | Example |
|---------|---------|---------|
| `Feature` | High-level description | Feature: User Authentication |
| `Background` | Shared preconditions | Background: Given a registered user |
| `Scenario` | Specific behavior example | Scenario: Successful login |
| `Given` | Precondition / initial state | Given the user is on the login page |
| `When` | Action / event | When the user enters valid credentials |
| `Then` | Expected outcome | Then the user is redirected to dashboard |
| `And` / `But` | Additional step | And the welcome message is displayed |
| `Scenario Outline` | Parameterized scenario | Scenario Outline: Login with <role> |
| `Examples` | Data table for outlines | Examples: \| role \| permission \| |

### Structure

```gherkin
Feature: [Feature Name]
  As a [role]
  I want [goal]
  So that [benefit]

  Background:
    Given [shared precondition]
    And [shared precondition]

  @tag
  Scenario: [Behavior description]
    Given [initial state]
    And [additional state]
    When [action]
    And [additional action]
    Then [expected outcome]
    And [additional expectation]
```

---

## Scenario Types

### 1. Happy Path (The "sunny day")
```gherkin
@critical @smoke
Scenario: Successfully authenticate with magic link
  Given a registered user with email "user@example.com"
  When the user requests a magic link
  Then a unique token is generated
  And an email is sent within 5 seconds
  And the token expires after 15 minutes
```

### 2. Error Path (The "rainy day")
```gherkin
@validation @error
Scenario: Reject expired magic link
  Given a user with an expired magic link
  When the user attempts to authenticate
  Then the response status is 401
  And the error code is "TOKEN_EXPIRED"
  And the error message contains "Link has expired"
```

### 3. Edge Case (Boundaries)
```gherkin
@edge-case
Scenario: Handle maximum concurrent requests
  Given the system is under normal load
  When 1000 users simultaneously request magic links
  Then all requests are processed
  And the response time P95 is less than 500ms
```

### 4. Security Path
```gherkin
@security
Scenario: Reject SQL injection in email field
  Given a user with malicious input "'; DROP TABLE users; --"
  When the user requests a magic link
  Then the input is sanitized
  And no database error occurs
  And the user receives a validation error
```

---

## Tags Strategy

Use tags to categorize and filter scenarios:

| Tag | Meaning | When to use |
|-----|---------|-------------|
| `@critical` | Must pass for release | Core business logic |
| `@smoke` | Quick health check | CI pipeline first stage |
| `@happy-path` | Normal flow | Regression testing |
| `@error` | Error handling | Resilience testing |
| `@validation` | Input validation | Security testing |
| `@security` | Security-related | Security audit |
| `@edge-case` | Boundary conditions | Stress testing |
| `@performance` | Performance-related | Load testing |
| `@integration` | Requires external systems | Integration suite |
| `@e2e` | End-to-end flow | Full system test |
| `@idempotency` | Idempotent operations | Reliability testing |
| `@wip` | Work in progress | Development |

---

## Scenario Outlines (Data-Driven)

```gherkin
Scenario Outline: Authenticate with different user roles
  Given a user with role "<role>"
  When the user accesses "<resource>"
  Then the response status is <status>
  And the user <can_or_cannot> view the resource

  Examples:
    | role  | resource      | status | can_or_cannot |
    | admin | /admin/users  | 200    | can           |
    | user  | /admin/users  | 403    | cannot        |
    | guest | /admin/users  | 401    | cannot        |
    | admin | /profile      | 200    | can           |
    | user  | /profile      | 200    | can           |
```

---

## BDD ↔ SDD Mapping

Every BDD scenario MUST trace back to a spec requirement:

```
Spec FR-001: "The system shall generate a unique magic link token"
    ↓
BDD Scenario: "Successfully authenticate with magic link"
    Given... When... Then a unique token is generated
    ↓
TDD Test: test_generate_unique_token()
    ↓
Code: generateToken() function
```

---

## Writing Good Scenarios

### ✅ DO
- **One behavior per scenario** — Test one thing
- **Concrete examples** — "user@example.com" not "a valid email"
- **Independent** — No dependency on other scenarios
- **Declarative** — WHAT not HOW ("clicks button" vs "submits form")
- **Business language** — Words stakeholders use

### ❌ DON'T
- **UI details** — "clicks the blue button" → "submits the form"
- **Multiple behaviors** — Split into separate scenarios
- **Technical jargon** — "calls the API" → "requests authentication"
- **Implementation assumptions** — "uses Redis" → "caches the result"

---

## BDD Frameworks by Language

| Language | Framework | Command |
|----------|-----------|---------|
| TypeScript | Cucumber.js | `npx cucumber-js` |
| Python | pytest-bdd | `pytest` |
| Go | godog | `godog` |
| Rust | cucumber-rs | `cargo test` |
| Java | Cucumber JVM | `mvn test` |
| C# | SpecFlow | `dotnet test` |
| Ruby | Cucumber | `cucumber` |

---

## Example: Complete Feature File

```gherkin
Feature: Magic Link Authentication
  As a user
  I want to log in with a magic link
  So that I don't have to remember a password

  Background:
    Given the authentication service is running
    And the email service is available

  @critical @smoke
  Scenario: Successfully request and use magic link
    Given a registered user with email "user@example.com"
    When the user requests a magic link
    Then a unique token is generated
    And an email is sent to "user@example.com"
    When the user clicks the magic link
    Then the user is authenticated
    And the token is invalidated

  @validation @error
  Scenario: Reject unregistered email
    Given an unregistered email "unknown@example.com"
    When a magic link is requested
    Then the response status is 404
    And no email is sent
    And the error code is "USER_NOT_FOUND"

  @security
  Scenario: Reject reused magic link
    Given a user who has already used their magic link
    When the user attempts to use the link again
    Then the response status is 401
    And the error code is "TOKEN_USED"

  @edge-case @performance
  Scenario: Handle rate limiting
    Given a user who has requested 3 magic links in the last hour
    When the user requests another magic link
    Then the response status is 429
    And the retry-after header is set to 3600 seconds

  @idempotency
  Scenario: Idempotent requests with same idempotency key
    Given a user with idempotency key "abc-123"
    When the user requests a magic link with key "abc-123"
    And the user requests a magic link with key "abc-123" again
    Then exactly one email is sent
    And both responses are identical
```

---

## BDD Checklist

- [ ] Every spec requirement has at least one BDD scenario
- [ ] Happy path, error path, and edge cases covered
- [ ] Scenarios are independent (no shared mutable state)
- [ ] Language is business-readable, not technical
- [ ] Tags are used for categorization
- [ ] Scenarios are executable (automation layer exists)
