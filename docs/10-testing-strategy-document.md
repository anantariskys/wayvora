# Wayvora Testing Strategy Document

Tools: Jest, Supertest, Playwright, React Testing Library

---

## 1. Testing Goals

Wayvora testing must prove:

- Auth flows are secure and reliable.
- Trip CRUD works with authorization.
- Optimization engine is deterministic and correct for known inputs.
- API contracts are stable.
- Frontend planner interactions are usable.
- Map rendering does not break core workflows.
- Deployment artifacts are healthy.

---

## 2. Testing Pyramid

```text
                 E2E Tests
              Playwright flows
          ------------------------
            Integration Tests
        API + DB + Mapbox mocks
    --------------------------------
              Unit Tests
  Algorithms, services, components
```

Most tests should be unit and integration tests. E2E tests should cover critical user journeys.

---

## 3. Backend Unit Testing

Tool: Jest

Targets:

- Auth service.
- Trip service policies.
- Optimization strategies.
- Matrix cache key builder.
- DTO validation behavior.
- Permission policies.

Example optimization unit test:

```ts
it('selects the nearest unvisited stop at each step', () => {
  const matrix = [
    [0, 5, 2],
    [5, 0, 1],
    [2, 1, 0],
  ];

  const result = nearestNeighbor.optimize({
    stops,
    costMatrix: matrix,
    startIndex: 0,
    returnToStart: false,
    objective: 'duration',
  });

  expect(result.orderedStopIndexes).toEqual([0, 2, 1]);
});
```

---

## 4. Backend Integration Testing

Tools: Jest, Supertest, test database

Targets:

- Register/login/refresh/logout.
- Create trip.
- Add place to trip.
- Reorder places.
- Optimize trip with mocked Mapbox response.
- Authorization failures.
- Validation failures.

Example flow:

```text
Register user
  -> Login
  -> Create trip
  -> Add 3 places
  -> Optimize route
  -> Assert route saved
```

Use a test database branch or containerized PostgreSQL. Avoid testing against production Neon.

---

## 5. API Testing

API tests should verify:

- Status codes.
- Response envelope.
- Error envelope.
- Validation details.
- Auth requirements.
- Ownership isolation.

Important negative tests:

- User A cannot access User B's trip.
- Viewer cannot optimize route.
- Expired access token is rejected.
- Revoked refresh token cannot be reused.
- Invalid coordinates are rejected.

---

## 6. Frontend Unit and Component Testing

Tools: React Testing Library, Jest or Vitest depending project setup

Targets:

- Login form validation.
- Create trip form validation.
- Itinerary list rendering.
- Route summary rendering.
- Empty states.
- Error states.
- Zustand store behavior.

Example:

```ts
it('disables optimize button when trip has fewer than two places', () => {
  render(<OptimizeRouteButton placeCount={1} />);
  expect(screen.getByRole('button', { name: /optimize/i })).toBeDisabled();
});
```

---

## 7. TanStack Query Testing

Test:

- Query keys.
- Mutation invalidation.
- Error handling.
- Optimistic reorder behavior.

Mock API client rather than real network calls for component tests.

---

## 8. E2E Testing

Tool: Playwright

Critical flows:

1. Register and create first trip.
2. Search and add destinations.
3. Optimize route.
4. Verify route summary appears.
5. Reload and verify trip persists.
6. Unauthorized user cannot view another trip.

Example Playwright scenario:

```text
Open app
  -> login
  -> create trip
  -> search "Tokyo Station"
  -> add place
  -> add two more places
  -> click optimize
  -> assert ordered itinerary visible
```

Map assertions:

- Map canvas loads.
- Markers appear.
- Route summary is visible.
- Route layer existence can be tested through UI state or data attributes.

---

## 9. Optimization Engine Testing

Test categories:

| Category | Example |
|---|---|
| Correctness | Known matrix returns expected order |
| Edge cases | 0, 1, 2 stops |
| Return-to-start | Start appended at end |
| Unreachable | Handles infinity/null costs |
| Determinism | Same input produces same output |
| Performance | 25 stops under target runtime |
| Immutability | Input arrays are not mutated |

Performance test target:

```text
Nearest Neighbor for 50 stops should run comfortably under 50 ms locally.
```

Provider latency is tested separately with mocked Mapbox clients.

---

## 10. Map Interaction Testing

Mapbox GL JS can be difficult in test environments.

Recommended approach:

- Unit test map data transformation functions.
- Component test fallback/skeleton states.
- E2E test map page in real browser.
- Mock Mapbox in Jest.

Testable map utilities:

- Convert route geometry to GeoJSON source.
- Compute bounding box.
- Build marker data from trip places.
- Select marker by trip place ID.

---

## 11. Load Testing

Tools:

- k6.
- Artillery.
- Railway/VPS metrics.

Load scenarios:

| Scenario | Target |
|---|---|
| Trip list | 100 concurrent users |
| Place search | 50 concurrent users with mocked provider |
| Optimization | 20 concurrent users, 10 stops each |
| Auth login | Controlled burst |

Measure:

- p50/p95/p99 latency.
- Error rate.
- Database connection saturation.
- Mapbox call volume.
- Cache hit rate.

---

## 12. CI Testing Pipeline

Recommended pipeline:

```text
Install dependencies
  -> Lint
  -> Typecheck
  -> Unit tests
  -> Backend integration tests
  -> Frontend build
  -> Playwright smoke tests
```

Production deploy should require:

- Passing tests.
- Successful build.
- Migration check.
- Environment validation.

---

## 13. Test Data Strategy

Use realistic fixtures:

- Tokyo city itinerary.
- Bali day trip.
- Paris museum route.
- Edge case with duplicate coordinates.

Avoid relying on live Mapbox in automated tests. Use recorded/mocked responses for repeatability.

