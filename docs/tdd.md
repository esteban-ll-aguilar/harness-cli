# TDD Guide — Test-Driven Development

> **Red, Green, Refactor.** No code without a failing test. No test without a requirement.

---

## What is TDD?

Test-Driven Development (TDD) is a methodology where you write a failing test **before** writing any production code.

```
Write Failing Test (Red) → Write Minimal Code (Green) → Refactor (Clean)
         ↑__________________________________________________________↓
```

## The TDD Cycle

### 1. Red — Write a failing test
- Write the test FIRST
- Run it — it MUST fail (proves the test is valid)
- If it passes, the test is wrong (or feature already exists)

### 2. Green — Write minimal code
- Write the SMALLEST amount of code to make the test pass
- Don't worry about elegance
- Copy-paste is allowed (temporarily)
- Hardcode if needed (temporarily)

### 3. Refactor — Clean up
- Remove duplication
- Improve names
- Extract methods/classes
- All tests must STAY green

---

## TDD Rules

1. **No production code without a failing test**
2. **Write only enough test to fail** (compilation failure counts)
3. **Write only enough code to pass**
4. **One concept per test** — Test one thing, not ten
5. **Test names are sentences** — `it('should invalidate token after use')`
6. **Tests are documentation** — They explain WHAT the code does

---

## Test Pyramid

```
        /\
       /  \     E2E Tests (few, slow, expensive)
      /____\
     /      \   Integration Tests (some, medium speed)
    /________\
   /          \ Unit Tests (many, fast, cheap)
  /____________\
```

| Layer | Scope | Speed | Quantity | Tool Example |
|-------|-------|-------|----------|--------------|
| **Unit** | Single function/class | <10ms | Hundreds | Vitest, pytest, JUnit |
| **Integration** | Multiple classes + DB | <100ms | Tens | Test containers |
| **E2E** | Full system via UI/API | <1s | Few | Playwright, Cypress |

**Rule:** 70% unit, 20% integration, 10% e2e

---

## Unit Test Structure (AAA)

```typescript
// Arrange — Set up the test
const mockRepo = { findById: vi.fn() };
mockRepo.findById.mockResolvedValue({ id: 'test' });
const useCase = new MyUseCase(mockRepo);

// Act — Execute the behavior
const result = await useCase.execute('test');

// Assert — Verify the outcome
expect(result).toEqual({ id: 'test' });
expect(mockRepo.findById).toHaveBeenCalledWith('test');
```

---

## TDD by Example: Magic Link Token

### Step 1: Red — Write failing test

```typescript
// test.spec.ts
it('should generate a cryptographically random token of 256 bits', () => {
  const token = generateToken();

  expect(token).toBeDefined();
  expect(token.length).toBe(43); // 256 bits = 32 bytes = 43 base64 chars
  expect(isBase64(token)).toBe(true);
});
```

**Run:** ❌ FAIL — `generateToken is not defined`

### Step 2: Green — Minimal implementation

```typescript
// token.ts
export function generateToken(): string {
  // Hardcoded for now — we'll fix in refactor
  return 'abc123'; // ❌ Test still fails (wrong length)
}
```

**Run:** ❌ FAIL — Expected 43, got 6

```typescript
// token.ts
export function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes));
}
```

**Run:** ✅ PASS

### Step 3: Refactor — Clean up

```typescript
// token.ts
const TOKEN_SIZE_BYTES = 32; // 256 bits

export function generateToken(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(TOKEN_SIZE_BYTES));
  return encodeBase64(randomBytes);
}

function encodeBase64(bytes: Uint8Array): string {
  const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
  return btoa(binary);
}
```

**Run:** ✅ PASS (all tests still green)

---

## Test Types

### 1. Happy Path Tests
```typescript
it('should return user when found by ID', async () => {
  mockRepo.findById.mockResolvedValue({ id: '1', name: 'Alice' });

  const result = await useCase.execute('1');

  expect(result.name).toBe('Alice');
});
```

### 2. Error Path Tests
```typescript
it('should throw NotFoundError when user does not exist', async () => {
  mockRepo.findById.mockResolvedValue(null);

  await expect(useCase.execute('999')).rejects.toThrow(NotFoundError);
});
```

### 3. Boundary Tests
```typescript
it('should reject email longer than 255 characters', () => {
  const longEmail = 'a'.repeat(250) + '@example.com';

  expect(() => createUser({ email: longEmail }))
    .toThrow(ValidationError);
});
```

### 4. Idempotency Tests
```typescript
it('should not send duplicate emails for same idempotency key', async () => {
  const key = 'unique-key-123';

  await service.sendEmail(key, { to: 'user@example.com' });
  await service.sendEmail(key, { to: 'user@example.com' });

  expect(mockEmailProvider.send).toHaveBeenCalledTimes(1);
});
```

### 5. Security Tests
```typescript
it('should sanitize SQL injection attempts', async () => {
  const maliciousInput = "'; DROP TABLE users; --";

  await service.search(maliciousInput);

  expect(mockDb.query).toHaveBeenCalledWith(
    expect.stringContaining('$1'),
    [maliciousInput]
  );
});
```

---

## Mocking Strategy

### What to Mock
- **External services** — HTTP APIs, email providers
- **Database** — Repository interfaces
- **Randomness** — UUIDs, timestamps (for determinism)
- **File system** — I/O operations

### What NOT to Mock
- **Value objects** — Simple data structures
- **Pure functions** — No side effects
- **The system under test** — Don't mock what you're testing

### Example: Repository Pattern

```typescript
// Port (interface) — defined in domain
interface IUserRepository {
  findById(id: string): Promise<User | null>;
  create(user: User): Promise<User>;
}

// Test — mock the port
const mockRepo: IUserRepository = {
  findById: vi.fn(),
  create: vi.fn(),
};

// Production — real implementation
class UserRepositoryPg implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }
}
```

---

## Coverage Rules

| Metric | Minimum | Target |
|--------|---------|--------|
| Lines | 80% | 90% |
| Branches | 80% | 85% |
| Functions | 80% | 90% |
| Statements | 80% | 90% |

**Important:** Coverage is a guardrail, not a goal. 100% coverage with bad tests is worse than 80% with good tests.

---

## TDD Checklist

- [ ] Test written BEFORE code
- [ ] Test fails before implementation (Red)
- [ ] Minimal code makes test pass (Green)
- [ ] Refactored while tests green
- [ ] Test name describes behavior, not implementation
- [ ] One concept per test
- [ ] Mocks verify interactions
- [ ] Edge cases covered
- [ ] Error paths tested
- [ ] Coverage > 80%

---

## Common Anti-Patterns

❌ **Testing implementation, not behavior**
```typescript
// BAD — tests HOW
expect(service.internalCache.get).toHaveBeenCalled();

// GOOD — tests WHAT
expect(result).toEqual(expectedData);
```

❌ **Tests depend on each other**
```typescript
// BAD — test 2 fails if test 1 doesn't run first
test('create user', () => { user = createUser(); });
test('update user', () => { updateUser(user.id); }); // depends on test 1
```

❌ **Testing trivial code**
```typescript
// BAD — testing a getter
expect(user.name).toBe('Alice'); // This is the language, not your code
```

❌ **Slow tests**
```typescript
// BAD — hits real database
const result = await realDb.query('SELECT * FROM users');

// GOOD — mock database
mockRepo.findAll.mockResolvedValue([user1, user2]);
```

---

## TDD Frameworks by Language

| Language | Unit Test | Mocking | Coverage |
|----------|-----------|---------|----------|
| TypeScript | Vitest, Jest | vi.fn(), jest.mock() | c8, istanbul |
| Python | pytest | unittest.mock | pytest-cov |
| Go | testing | testify/mock | go test -cover |
| Rust | built-in | mockall | cargo-tarpaulin |
| Java | JUnit 5 | Mockito | JaCoCo |
| C# | xUnit | Moq | Coverlet |
| Ruby | RSpec | RSpec mocks | SimpleCov |
| PHP | PHPUnit | Mockery | PHPUnit coverage |
