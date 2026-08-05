Feature: {{name}}
  As a [role]
  I want [goal]
  So that [benefit]

  # Background applies to all scenarios in this feature
  Background:
    Given the system is initialized
    And the database is seeded with test data

  # ============================================================
  # HAPPY PATH SCENARIOS
  # ============================================================

  @critical @smoke
  Scenario: Successfully [main action]
    Given [precondition state]
    And [additional precondition]
    When [user/system action]
    Then [expected outcome]
    And [additional expectation]
    And [side effect verification]

  @happy-path
  Scenario: [Alternative happy path]
    Given [precondition]
    When [alternative action]
    Then [expected outcome]

  # ============================================================
  # VALIDATION / ERROR SCENARIOS
  # ============================================================

  @validation @error
  Scenario: Reject [invalid input type]
    Given [valid precondition]
    When [action with invalid input]
    Then the response status should be 400
    And the error code should be "VALIDATION_ERROR"
    And the error message should contain "[expected message]"
    And no [side effect] should occur

  @validation @error
  Scenario Outline: Reject various invalid inputs
    Given [precondition]
    When [action] with <invalid_input>
    Then the response status should be 400
    And the error should reference field "<field>"

    Examples:
      | invalid_input | field |
      | empty string  | name  |
      | null          | name  |
      | 256 chars     | name  |

  # ============================================================
  # AUTHENTICATION / AUTHORIZATION
  # ============================================================

  @auth @security
  Scenario: Reject unauthenticated request
    Given no authenticated user
    When [protected action]
    Then the response status should be 401
    And the error code should be "UNAUTHORIZED"

  @auth @security
  Scenario: Reject unauthorized request
    Given an authenticated user with role "user"
    When [admin-only action]
    Then the response status should be 403
    And the error code should be "FORBIDDEN"

  # ============================================================
  # EDGE CASES & BOUNDARIES
  # ============================================================

  @edge-case
  Scenario: Handle [boundary condition]
    Given [boundary state]
    When [action at boundary]
    Then [expected boundary behavior]

  @edge-case @concurrency
  Scenario: Handle concurrent [actions]
    Given [initial state]
    When 10 users simultaneously [action]
    Then exactly 1 should succeed
    And 9 should receive "CONFLICT" error

  # ============================================================
  # PERFORMANCE
  # ============================================================

  @performance
  Scenario: Respond within acceptable time
    Given [typical load state]
    When [action]
    Then the response time should be less than 200ms

  # ============================================================
  # IDEMPOTENCY
  # ============================================================

  @idempotency
  Scenario: Repeated identical requests produce same result
    Given [state]
    When [action] is called with idempotency key "abc-123"
    And [action] is called again with idempotency key "abc-123"
    Then both responses should be identical
    And [side effect] should occur exactly once
