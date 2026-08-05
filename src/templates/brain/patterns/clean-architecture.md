# Pattern: Clean Architecture / Hexagonal

> Reference pattern for all specs unless overridden by ADR.

## Layers (Inside → Outside)

1. **Domain** (Entities, Value Objects, Domain Events)
   - Pure business logic
   - Zero external dependencies
   - Framework-agnostic

2. **Application** (Use Cases, DTOs, Ports)
   - Orchestrates domain logic
   - Defines interfaces (ports) for infrastructure
   - No knowledge of specific frameworks

3. **Infrastructure** (Adapters, Controllers, Repositories)
   - Implements ports defined in application
   - Contains framework-specific code
   - External service clients

## Dependency Rule

```
Infrastructure ──depends on──► Application ──depends on──► Domain
```

Arrows point INWARD. Domain knows nothing about outer layers.

## File Structure

```
src/
├── domain/
│   ├── entities/
│   ├── value-objects/
│   ├── events/
│   └── repositories/        # Port interfaces only
├── application/
│   ├── use-cases/
│   ├── dto/
│   └── services/
└── infrastructure/
    ├── persistence/         # Repository implementations
    ├── http/                # Controllers, middleware
    └── external/            # Third-party service clients
```

## Naming Conventions

- Port (interface): `I[Entity]Repository`
- Adapter (impl): `[Entity]RepositoryPg` or `[Entity]RepositoryRedis`
- Use Case: `[Action][Entity]UseCase`
- DTO: `[Action][Entity]Dto`

## Validation

- Domain validation: Business rules (e.g., "email must be unique")
- Application validation: Input shape (zod schemas)
- Infrastructure validation: DB constraints, API rate limits
