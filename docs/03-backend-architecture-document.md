# Wayvora Backend Architecture Document

Stack: NestJS, TypeScript, REST API, JWT, Refresh Tokens, RBAC, Drizzle ORM, Neon PostgreSQL

---

## 1. Backend Responsibilities

The backend is the source of truth for Wayvora. It owns:

- Authentication and session security.
- Authorization and RBAC.
- Trip, place, route, favorite, review, and collaborator persistence.
- Mapbox API integration.
- Route optimization logic.
- Data validation and error normalization.
- Rate limiting, logging, and operational controls.

The frontend should never call protected Mapbox APIs directly except for safe client-side rendering through Mapbox GL JS public tokens.

---

## 2. Module Architecture

```text
AppModule
  |
  +-- ConfigModule
  +-- DatabaseModule
  +-- AuthModule
  +-- UsersModule
  +-- TripsModule
  +-- PlacesModule
  +-- RoutesModule
  +-- OptimizationModule
  +-- FavoritesModule
  +-- ReviewsModule
  +-- CollaboratorsModule
  +-- MapboxModule
  +-- HealthModule
```

Modules are organized by business capability. The optimization module depends on trips, places, routes, and Mapbox clients, but controllers remain thin.

---

## 3. Suggested Folder Structure

```text
apps/api/src
  main.ts
  app.module.ts
  config/
    env.schema.ts
    app.config.ts
  database/
    database.module.ts
    db.client.ts
    schema/
      users.schema.ts
      trips.schema.ts
      places.schema.ts
      routes.schema.ts
      index.ts
    migrations/
  common/
    decorators/
      current-user.decorator.ts
      roles.decorator.ts
    filters/
      http-exception.filter.ts
    guards/
      jwt-auth.guard.ts
      roles.guard.ts
    interceptors/
      logging.interceptor.ts
      response-transform.interceptor.ts
    pagination/
      pagination.dto.ts
      pagination.util.ts
    errors/
      app-error.ts
  auth/
    auth.module.ts
    auth.controller.ts
    auth.service.ts
    dto/
      login.dto.ts
      register.dto.ts
      refresh-token.dto.ts
    strategies/
      jwt.strategy.ts
      refresh-token.strategy.ts
    repositories/
      refresh-token.repository.ts
  users/
  trips/
  places/
  routes/
  optimization/
    optimization.controller.ts
    optimization.service.ts
    dto/
      optimize-trip.dto.ts
    strategies/
      route-optimization.strategy.ts
      nearest-neighbor.strategy.ts
    matrix/
      distance-matrix.service.ts
      matrix-cache.repository.ts
    types/
      optimization.types.ts
  mapbox/
    mapbox.module.ts
    mapbox.service.ts
    mapbox-matrix.client.ts
    mapbox-directions.client.ts
    mapbox-search.client.ts
```

---

## 4. Dependency Flow

```text
Controller
  -> Service
    -> Domain Strategy / Domain Utility
    -> Repository
      -> Drizzle Database Client
    -> External Client
      -> Mapbox API
```

Rules:

- Controllers do not call Drizzle directly.
- Repositories do not contain business logic.
- Services orchestrate use cases.
- External API clients are isolated in `MapboxModule`.
- Optimization algorithms are strategy classes with pure computation where possible.

---

## 5. Auth Module

### Responsibilities

- Register users.
- Login users.
- Issue access and refresh tokens.
- Rotate refresh tokens.
- Detect refresh token reuse.
- Logout and revoke sessions.
- Hash passwords.

### Token Strategy

| Token | Lifetime | Storage | Purpose |
|---|---|---|---|
| Access token | 10-15 minutes | Frontend memory or secure client handling | API authorization |
| Refresh token | 7-30 days | HttpOnly cookie preferred or secure storage | Renew access |

Refresh tokens should be stored hashed in the database.

### Login Flow

```text
POST /auth/login
  -> Validate email/password
  -> Compare password hash
  -> Create refresh token record
  -> Return access token
  -> Set refresh token cookie or return refresh token based on client strategy
```

### Refresh Flow

```text
POST /auth/refresh
  -> Validate refresh token
  -> Hash incoming token and find active record
  -> Revoke old refresh token
  -> Issue new refresh token
  -> Issue new access token
```

Refresh token reuse detection:

- If a revoked refresh token is used again, revoke all tokens for that user/session family.
- Log a security event.
- Force re-authentication.

---

## 6. RBAC Strategy

Roles:

| Role | Scope |
|---|---|
| `user` | Default traveler |
| `admin` | Operational access |
| `trip_owner` | Derived from trip ownership |
| `trip_editor` | Collaborator role |
| `trip_viewer` | Collaborator role |

Global roles are stored on `users.role`. Trip roles are stored on `trip_collaborators`.

Example decorators:

```ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Get('/admin/users')
findUsers() {}
```

Trip authorization should use policy-style checks:

```ts
await this.tripAccessPolicy.assertCanEditTrip(user.id, tripId);
```

This is better than putting complex ownership logic inside generic guards.

---

## 7. DTO Validation

Backend uses `class-validator` and `class-transformer`.

Example:

```ts
export class CreateTripDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
```

Validation pipe:

```ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
);
```

---

## 8. Core Modules

### UsersModule

Responsibilities:

- User profile.
- Role field.
- Account status.
- User preferences.

Key service methods:

- `findById`
- `findByEmail`
- `createUser`
- `updateProfile`
- `deactivateUser`

### TripsModule

Responsibilities:

- Trip CRUD.
- Trip ownership.
- Trip metadata.
- Trip list filtering.
- Trip place ordering orchestration.

Important invariants:

- A trip must have one owner.
- Only owner/editor can modify places.
- Deleting a trip should cascade or soft-delete related rows based on product policy.

### PlacesModule

Responsibilities:

- Search destinations.
- Normalize Mapbox candidates.
- Persist canonical place records.
- Manage favorites and place metadata.

Place records should avoid over-coupling to Mapbox. Store provider IDs, but keep app-owned IDs as primary keys.

### RoutesModule

Responsibilities:

- Store generated route summaries.
- Store encoded polyline or GeoJSON.
- Track optimization metadata.
- Serve route visualization payloads.

### OptimizationModule

Responsibilities:

- Validate optimization request.
- Load trip places.
- Build distance matrix.
- Run route optimization strategy.
- Request route geometry.
- Persist route result.

---

## 9. Optimization Module Communication

```text
OptimizationController
  -> OptimizationService.optimizeTrip(userId, tripId, dto)
       -> TripsService.assertCanOptimize(...)
       -> TripPlacesRepository.findByTripId(...)
       -> DistanceMatrixService.getMatrix(...)
       -> RouteOptimizer.optimize(...)
       -> DirectionsService.getRouteGeometry(...)
       -> RoutesRepository.saveOptimizedRoute(...)
```

The algorithm should not know about NestJS, HTTP, Drizzle, or Mapbox. It receives arrays and returns arrays.

---

## 10. Repository/Data Access Layer

Repositories wrap Drizzle queries and make database access predictable.

Example repository pattern:

```ts
export class TripsRepository {
  constructor(private readonly db: Database) {}

  async findByIdForUser(tripId: string, userId: string) {
    return this.db.query.trips.findFirst({
      where: and(eq(trips.id, tripId), eq(trips.ownerId, userId)),
    });
  }
}
```

Repository guidelines:

- Return typed domain records.
- Keep query composition explicit.
- Use transactions for multi-table writes.
- Do not hide expensive joins behind innocent method names.

---

## 11. Guards, Interceptors, and Filters

### Guards

| Guard | Responsibility |
|---|---|
| `JwtAuthGuard` | Validate access token |
| `RolesGuard` | Check global roles |
| `TripAccessGuard` | Optional route-level trip access |
| `ThrottlerGuard` | Rate limiting |

### Interceptors

| Interceptor | Responsibility |
|---|---|
| Logging | Request latency and metadata |
| Response transform | Consistent response shape |
| Timeout | Prevent hanging external calls |

### Exception Filter

Global exception filter should normalize errors:

```json
{
  "success": false,
  "error": {
    "code": "TRIP_NOT_FOUND",
    "message": "Trip was not found or you do not have access.",
    "details": null
  },
  "requestId": "req_01J..."
}
```

---

## 12. Background Jobs

MVP synchronous:

- Place search: synchronous.
- Optimization: synchronous for limited stop count.
- Route geometry: synchronous after optimization.

Future asynchronous:

- Long route optimization.
- AI recommendation generation.
- Matrix cache warming.
- Email invitation delivery.
- Expired refresh token cleanup.

Suggested architecture:

```text
API process
  -> enqueue job
Redis/BullMQ
  -> worker process
PostgreSQL
  -> job status and results
```

---

## 13. Cron Jobs

Recommended scheduled jobs:

| Job | Frequency | Purpose |
|---|---|---|
| Delete expired refresh tokens | Daily | Security hygiene |
| Purge stale matrix cache | Weekly | Control storage |
| Recompute popular route cache | Daily later | Performance |
| Soft-delete cleanup | Weekly | Data lifecycle |

---

## 14. Scalability Considerations

### API Scaling

- Keep API stateless.
- Use database-backed refresh tokens.
- Avoid server-local session state.
- Configure connection pooling for Neon.

### Mapbox Scaling

- Cache matrix and directions results.
- Set endpoint-level rate limits.
- Deduplicate concurrent optimization requests for the same trip.
- Round coordinates carefully for cache keys.

### Database Scaling

- Index owner-based trip queries.
- Index trip place order lookups.
- Avoid storing huge route geometry inside hot trip rows.
- Use JSONB for provider metadata, not for core relational fields.

---

## 15. Backend Quality Bar

The backend should be considered production-ready when:

- Auth flows are tested.
- Refresh token rotation works.
- All protected endpoints enforce ownership or collaborator policies.
- Optimization algorithm has deterministic tests.
- Mapbox clients have timeout and error handling.
- Database migrations are reproducible.
- API errors are consistent.
- Health endpoint supports deployment probes.

