package com.{{project}}.{{slug}};

/**
 * TDD Test Suite: {{name}}
 * Spec: specs/{{id}}-{{slug}}/spec.md
 * Language: Java
 * Agent: Tester → Coder
 * Framework: JUnit 5 + Mockito
 *
 * RULE: All tests must FAIL before implementation (Red phase)
 * RULE: One concept per test
 */

import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class {{Name}}Test {

    @Mock
    private EntityRepository repository;

    @Mock
    private ExternalService externalService;

    @InjectMocks
    private UseCase useCase;

    // ============================================================
    // TESTS: Domain Entity
    // ============================================================

    @Test
    @DisplayName("Should create valid entity with all required fields")
    void createValidEntity() {
        // TODO: Implement test (Red phase)
        // Arrange
        // Act
        // Assert
        fail("Implement: create valid entity");
    }

    @Test
    @DisplayName("Should reject creation with missing required field")
    void rejectMissingRequiredField() {
        fail("Implement: reject missing field");
    }

    @Test
    @DisplayName("Should reject invalid email format")
    void rejectInvalidEmail() {
        fail("Implement: reject invalid email");
    }

    @Test
    @DisplayName("Should trim whitespace from string fields")
    void trimWhitespace() {
        fail("Implement: trim whitespace");
    }

    @Test
    @DisplayName("Should validate maximum length of 255")
    void validateMaxLength() {
        fail("Implement: max length validation");
    }

    // ============================================================
    // TESTS: Use Case
    // ============================================================

    @Test
    @DisplayName("Should successfully perform action with valid input")
    void successfulAction() {
        // Arrange
        when(repository.findById("test-id"))
            .thenReturn(new Entity("test-id", "Test"));

        // Act
        // Result result = useCase.execute(input);

        // Assert
        fail("Implement: successful action");
    }

    @Test
    @DisplayName("Should persist changes to repository")
    void persistChanges() {
        fail("Implement: persist changes");
    }

    @Test
    @DisplayName("Should throw NotFoundException when entity does not exist")
    void notFoundError() {
        when(repository.findById("missing-id")).thenReturn(null);

        // assertThrows(NotFoundException.class, () -> useCase.execute(input));
        fail("Implement: not found error");
    }

    @Test
    @DisplayName("Should throw ValidationException for invalid input")
    void validationError() {
        fail("Implement: validation error");
    }

    @Test
    @DisplayName("Should return same result for identical idempotency keys")
    void idempotency() {
        fail("Implement: idempotency");
    }

    // ============================================================
    // TESTS: Repository (Integration)
    // ============================================================

    @Test
    @DisplayName("Should insert entity into database")
    @Tag("integration")
    void insertEntity() {
        fail("Implement: DB insert");
    }

    @Test
    @DisplayName("Should return entity when found")
    @Tag("integration")
    void findById() {
        fail("Implement: find by ID");
    }

    @Test
    @DisplayName("Should safely handle SQL injection attempts")
    @Tag("integration")
    void sqlInjectionSafety() {
        String maliciousInput = "'; DROP TABLE users; --";
        // Verify query is parameterized
        fail("Implement: SQL injection safety");
    }

    // ============================================================
    // TESTS: HTTP Controller (Integration)
    // ============================================================

    @Test
    @DisplayName("POST should return 201 with created entity")
    @Tag("integration")
    void postCreated() {
        fail("Implement: 201 created");
    }

    @Test
    @DisplayName("Should return 401 without auth token")
    @Tag("integration")
    void unauthorized() {
        fail("Implement: 401 unauthorized");
    }

    @Test
    @DisplayName("Should return 429 when rate limit exceeded")
    @Tag("integration")
    void rateLimited() {
        fail("Implement: 429 rate limited");
    }
}
