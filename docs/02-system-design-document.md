# Wayvora System Design Document

Status: Architecture Draft  
Scope: End-to-end platform architecture for Wayvora  
Primary Constraint: Frontend and backend must be separated services

---

## 1. High-Level Architecture

Wayvora is designed as a separated fullstack system:

- The frontend is a Next.js application deployed on Vercel.
- The backend is a NestJS REST API deployed on Railway or a Docker VPS.
- The database is Neon PostgreSQL.
- Mapbox APIs provide geocoding, distance matrix, and route geometry.
- The optimization engine runs in the backend as an isolated domain module.

```text
                     +-----------------------------+
                     |        User Browser         |
                     +--------------+--------------+
                                    |
                                    | HTTPS
                                    v
                     +-----------------------------+
                     | Next.js Frontend (Vercel)   |
                     | - App Router                |
                     | - TanStack Query            |
                     | - Zustand                   |
                     | - MapLibre GL JS            |
                     +--------------+--------------+
                                    |
                                    | REST/JSON over HTTPS
                                    v
                     +-----------------------------+
                     | NestJS Backend API          |
                     | - Auth / RBAC               |
                     | - Trips / Places            |
                     | - Optimization Engine       |
                     | - Mapbox Integration        |
                     | - Rate Limiting             |
                     +------+-----------+----------+
                            |           |
                 SQL/TLS    |           | HTTPS
                            v           v
              +------------------+   +-------------------------+
              | Neon PostgreSQL  |   | Mapbox APIs             |
              | - Trips          |   | - Search/Geocoding      |
              | - Places         |   | - Matrix API            |
              | - Routes         |   | - Directions API        |
              | - Cache Tables   |   +-------------------------+
              +------------------+
```

---

## 2. Architectural Decisions

| Decision | Choice | Reasoning |
|---|---|---|
| Frontend/backend separation | Separate Next.js and NestJS services | Independent scaling, cleaner API contracts, production SaaS architecture |
| API style | REST | Clear resource modeling, easy documentation, simple integration |
| Database | PostgreSQL on Neon | Relational integrity, JSONB support, future PostGIS compatibility, serverless scaling |
| ORM | Drizzle | Type-safe SQL-first development, lightweight migrations, predictable queries |
| Maps provider | Mapbox | Strong GL renderer, Directions API, Matrix API, developer-friendly ecosystem |
| Optimization MVP | Nearest Neighbor | Fast, explainable heuristic for small to medium route sets |
| Auth | JWT access + rotating refresh tokens | Stateless API access with secure session renewal |
| State management | TanStack Query + Zustand | Server cache separated from local UI state |

---

## 3. Frontend/Backend Separation Benefits

Frontend/backend separation gives Wayvora a realistic SaaS architecture:

- The frontend can ship UI improvements independently.
- The backend can evolve API contracts, auth, and optimization logic without being bundled into frontend runtime.
- Mobile apps or partner integrations can reuse the same API.
- Backend secrets such as Mapbox private tokens, JWT secrets, and database credentials never ship to the browser.
- Backend services can be scaled based on API and optimization load.

Tradeoff:

- Requires stronger API versioning and contract discipline.
- Adds CORS, auth token handling, and deployment complexity.
- Requires observability across service boundaries.

---

## 4. Service Communication Flow

```text
User action
  -> Next.js UI event
  -> API client attaches access token
  -> NestJS validates JWT and RBAC
  -> Controller validates DTO
  -> Service applies business logic
  -> Repository executes Drizzle query
  -> Optional Mapbox call
  -> Optional optimization engine
  -> API response
  -> TanStack Query cache update
  -> UI re-renders map/sidebar
```

Example: optimize trip

```text
POST /trips/:tripId/optimize
  1. Auth guard validates access token.
  2. Trip service checks ownership/collaborator role.
  3. Trip places are loaded from PostgreSQL.
  4. Matrix cache is checked.
  5. Missing matrix data is requested from Mapbox Matrix API.
  6. Optimization engine computes visit order.
  7. Directions API generates route geometry.
  8. Route summary and geometry are persisted.
  9. API returns optimized itinerary payload.
```

---

## 5. REST API Communication Architecture

API conventions:

- Base path: `/api/v1`
- JSON request/response bodies.
- Bearer JWT for protected endpoints.
- Consistent error envelope.
- Cursor or page pagination for list endpoints.
- Resource-oriented URLs.

```text
/api/v1/auth/*
/api/v1/users/*
/api/v1/trips/*
/api/v1/places/*
/api/v1/routes/*
/api/v1/optimization/*
```

REST is chosen because Wayvora has clear resources: users, trips, places, routes, reviews, favorites, collaborators. Optimization is modeled as an action on a trip because it mutates route state and produces a derived itinerary.

---

## 6. Optimization Engine Architecture

The optimization engine is a backend domain module, not a frontend utility. This keeps algorithmic behavior consistent, protects Mapbox usage, enables caching, and allows future background processing.

```text
OptimizationController
        |
        v
OptimizationService
        |
        +--> DistanceMatrixService
        |       +--> MatrixCacheRepository
        |       +--> MapboxMatrixClient
        |
        +--> RouteOptimizer
        |       +--> NearestNeighborStrategy
        |       +--> FutureStrategyInterface
        |
        +--> DirectionsService
        |       +--> MapboxDirectionsClient
        |
        +--> RoutesRepository
```

Strategy interface:

```ts
interface RouteOptimizationStrategy {
  optimize(input: OptimizationInput): OptimizationResult;
}
```

This allows future algorithms without changing controllers or API contracts.

---

## 7. Geospatial Flow

```text
Destination Search:
Frontend search input
  -> Backend places search endpoint
  -> Mapbox Search/Geocoding API
  -> Normalize place data
  -> Return candidates

Trip Place Add:
User selects candidate
  -> Backend stores canonical place fields
  -> trip_places links place to trip

Optimization:
Trip places
  -> Coordinates array
  -> Matrix API
  -> Distance/duration matrix
  -> Nearest Neighbor
  -> Directions API
  -> Route geometry
  -> Map render
```

The system stores latitude/longitude as numeric columns in MVP and remains compatible with future PostGIS `geometry(Point, 4326)` columns.

---

## 8. Route Generation Flow

```text
+-------------+      +------------------+      +----------------+
| Trip Places | ---> | Distance Matrix  | ---> | Optimization   |
+-------------+      +------------------+      +----------------+
                              |                         |
                              v                         v
                     +------------------+      +----------------+
                     | Matrix Cache     |      | Ordered Stops  |
                     +------------------+      +----------------+
                                                        |
                                                        v
                                               +----------------+
                                               | Directions API |
                                               +----------------+
                                                        |
                                                        v
                                               +----------------+
                                               | Route Geometry |
                                               +----------------+
```

---

## 9. Scalability Design

### Horizontal Scaling

The backend should remain stateless for normal API requests:

- Access tokens are stateless JWTs.
- Refresh token state is stored in PostgreSQL.
- No in-memory session dependency.
- Optimization jobs can later move to a queue.

### Database Scaling

Neon supports serverless branching, autoscaling characteristics, and connection pooling. The backend should use a pooler connection URL in serverless-like environments.

Key database scaling tactics:

- Index user-owned queries.
- Avoid N+1 trip place loading.
- Cache distance matrices.
- Store route geometry separately from trip metadata.
- Add read replicas if analytics load grows.

### Optimization Scaling

Optimization grows with number of destinations. For MVP, synchronous optimization is acceptable for small trip sizes. For larger trips:

- Move optimization into background jobs.
- Return `202 Accepted`.
- Push status through polling or WebSockets.
- Store job status in `optimization_jobs`.

---

## 10. Caching Layer

### MVP Cache

Use PostgreSQL cache tables:

- `cached_distance_matrices`
- Optional `cached_route_geometries`

Why PostgreSQL cache first:

- Simple operational model.
- Persistent across deploys.
- Easy to inspect.
- Good enough for MVP and portfolio.

### Future Cache

Add Redis when:

- Matrix lookups become high volume.
- Rate limiting needs distributed counters.
- Background queues require BullMQ.
- Route preview caching needs low latency.

Caching candidates:

| Data | Cache Key | TTL |
|---|---|---|
| Distance matrix | profile + rounded coordinate set | 7-30 days |
| Search results | query + proximity + language | 1-7 days |
| Directions geometry | ordered coordinates + profile | 7-30 days |
| User trip list | user id + filters | Short client-side cache |

---

## 11. Background Jobs and Queue Architecture

MVP can run optimization synchronously for trips up to a configured stop count.

Future asynchronous architecture:

```text
POST /trips/:id/optimize
  -> Create optimization job
  -> Enqueue job
  -> Return 202 with job id

Worker
  -> Load job
  -> Load trip places
  -> Fetch/cache matrix
  -> Run algorithm
  -> Generate route geometry
  -> Persist result
  -> Mark job complete
```

Suggested tools:

- BullMQ with Redis for queueing.
- NestJS schedule for cleanup jobs.
- PostgreSQL for durable job metadata.

---

## 12. Fault Tolerance

| Failure | Mitigation |
|---|---|
| Mapbox Matrix API timeout | Retry with exponential backoff, return retryable error |
| Mapbox rate limit | Cache aggressively, rate limit users, show friendly error |
| Database connection issue | Health checks, pooling, circuit breaker behavior |
| Optimization algorithm error | Validate input, fallback to original order |
| Token theft | Refresh token rotation and reuse detection |
| Partial route generation | Store route status and avoid corrupting previous route |

Route updates should be transactional where possible. If optimization succeeds but route geometry fails, the API can return optimized order with `routeGeometryStatus: "failed"` and allow retry.

---

## 13. Rate Limiting

Rate limits protect backend resources and Mapbox spend.

Example policy:

| Endpoint Type | Limit |
|---|---|
| Auth login | 5 requests/min/IP |
| Search places | 60 requests/min/user |
| Optimize route | 10 requests/hour/user on free tier |
| Trip CRUD | 120 requests/min/user |

Implementation:

- NestJS throttler for MVP.
- Redis-backed distributed rate limiting later.
- Tier-aware limits for future subscriptions.

---

## 14. Monitoring and Logging

### Logs

Use structured JSON logs:

- request id
- user id when authenticated
- endpoint
- status code
- latency
- Mapbox request metadata
- optimization stop count
- cache hit/miss

### Metrics

| Metric | Why It Matters |
|---|---|
| API p95 latency | User experience and backend health |
| Optimization latency | Main feature performance |
| Matrix cache hit rate | Cost and speed |
| Mapbox error rate | Provider reliability |
| Login failure rate | Security signal |
| Route generation failure rate | Core feature quality |

### Tracing

Future OpenTelemetry spans:

```text
HTTP request
  -> Auth guard
  -> Trip load
  -> Matrix cache lookup
  -> Mapbox Matrix call
  -> Optimization algorithm
  -> Directions call
  -> Database write
```

---

## 15. Deployment Architecture

```text
GitHub
  |
  +--> Vercel Frontend
  |       - Next.js build
  |       - Public Mapbox token
  |       - API base URL
  |
  +--> Railway Backend or Docker VPS
  |       - NestJS build
  |       - Database URL
  |       - JWT secrets
  |       - Mapbox secret token
  |
  +--> Neon PostgreSQL
          - Production branch
          - Preview branches
          - Connection pooling
```

Recommended environments:

- `local`
- `preview`
- `staging`
- `production`

Each environment should have separate secrets and database branches.
