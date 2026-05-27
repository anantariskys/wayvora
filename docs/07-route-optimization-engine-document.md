# Wayvora Route Optimization Engine Document

Primary Feature: Travel Route Optimization  
MVP Algorithm: Nearest Neighbor  
Future Algorithms: 2-opt, Genetic Algorithm, Simulated Annealing, constraint solvers

---

## 1. Purpose

The optimization engine converts an unordered or manually ordered set of trip destinations into an efficient visit sequence. It uses real travel distances or durations from a distance matrix and produces an optimized itinerary that can be visualized on a map.

Core flow:

```text
Destinations -> Distance Matrix -> Optimization Algorithm -> Ordered Stops -> Route Geometry -> Saved Itinerary
```

---

## 2. Problem Definition

Given:

- A set of `n` places.
- Coordinates for each place.
- A travel profile such as driving, walking, or cycling.
- Optional start place.
- Optional return-to-start setting.

Find:

- An order of visiting places that minimizes total travel distance or duration.

This is closely related to the Traveling Salesman Problem.

---

## 3. Traveling Salesman Problem Explanation

The Traveling Salesman Problem asks:

> Given a list of cities and travel costs between each pair, what is the shortest route that visits every city exactly once and returns to the origin?

For Wayvora, the problem is adapted:

- The "cities" are trip destinations.
- The "cost" can be driving time, walking time, distance, or a weighted score.
- Returning to the start may be optional.
- Some places may be locked in position in future versions.
- Routes may later include time windows, opening hours, and user preferences.

---

## 4. Why Brute Force Is Impossible

Brute force checks every possible route permutation.

Number of possible routes:

```text
n! = n * (n - 1) * (n - 2) * ... * 1
```

| Stops | Permutations |
|---:|---:|
| 5 | 120 |
| 10 | 3,628,800 |
| 15 | 1,307,674,368,000 |
| 20 | 2,432,902,008,176,640,000 |

Even if evaluating one route were very fast, brute force becomes unusable quickly. Travel apps need fast responses, so Wayvora uses heuristic algorithms.

---

## 5. Why Heuristics Are Chosen

Heuristics trade perfect optimality for speed and scalability.

For travel planning, this is often the right tradeoff:

- Users need a good route quickly.
- Travel time estimates are already approximate.
- Map provider data can change.
- User preferences may matter more than mathematically perfect distance.
- UX responsiveness is more valuable than exact optimality for MVP.

MVP uses Nearest Neighbor because it is:

- Simple to explain.
- Fast.
- Deterministic.
- Easy to test.
- Good enough for small to medium route sets.

---

## 6. Distance Matrix Handling

The engine does not calculate road distances itself. It uses Mapbox Matrix API.

Matrix example for 4 stops:

```text
        A    B    C    D
A       0   12    7   20
B      10    0    9   13
C       8   11    0    6
D      21   14    5    0
```

Each cell represents travel cost from origin row to destination column.

Cost can be:

- Distance in meters.
- Duration in seconds.
- Weighted score in future versions.

For MVP, duration is often better than distance because travelers care about time.

---

## 7. Nearest Neighbor Algorithm

Nearest Neighbor starts from one place and repeatedly visits the nearest unvisited place.

Steps:

1. Choose start node.
2. Mark start as visited.
3. Look at all unvisited nodes.
4. Select the node with the lowest travel cost from current node.
5. Move to that node.
6. Repeat until all nodes are visited.
7. Optionally return to start.

---

## 8. Pseudocode

```text
function nearestNeighbor(stops, matrix, startIndex, returnToStart):
    visited = set()
    route = []
    current = startIndex

    route.append(current)
    visited.add(current)

    while visited.size < stops.length:
        bestNext = null
        bestCost = infinity

        for candidate in 0..stops.length-1:
            if candidate in visited:
                continue

            cost = matrix[current][candidate]

            if cost < bestCost:
                bestCost = cost
                bestNext = candidate

        if bestNext is null:
            throw OptimizationError("No reachable unvisited stop")

        route.append(bestNext)
        visited.add(bestNext)
        current = bestNext

    if returnToStart:
        route.append(startIndex)

    return route
```

---

## 9. TypeScript-Oriented Interface

```ts
type Stop = {
  tripPlaceId: string;
  name: string;
  latitude: number;
  longitude: number;
  isLocked?: boolean;
};

type OptimizationInput = {
  stops: Stop[];
  costMatrix: number[][];
  startIndex: number;
  returnToStart: boolean;
  objective: 'duration' | 'distance';
};

type OptimizationResult = {
  orderedStopIndexes: number[];
  totalCost: number;
  algorithm: 'nearest_neighbor';
  runtimeMs: number;
};
```

---

## 10. Complexity Analysis

Nearest Neighbor complexity:

- Time complexity: `O(n^2)`
- Space complexity: `O(n)` excluding matrix
- Matrix storage: `O(n^2)`

For `n = 25`, algorithmic cost is small. The bigger bottleneck is usually Mapbox Matrix API latency and provider limits.

---

## 11. Optimization Tradeoffs

| Dimension | Nearest Neighbor | Impact |
|---|---|---|
| Speed | Excellent | Fast UX |
| Optimality | Not guaranteed | Route may be locally greedy |
| Simplicity | Excellent | Easy to test/debug |
| Determinism | Strong | Same input produces same output |
| Constraint support | Limited | Needs extension for locked stops/time windows |

Nearest Neighbor can make poor choices when an early local decision causes an expensive final segment. Future improvement with 2-opt can reduce this issue.

---

## 12. Route Recalculation Flow

Recalculation triggers:

- User adds a place.
- User removes a place.
- User changes transport profile.
- User changes start point.
- User manually reorders places and requests route generation.
- Cached matrix expires.

Flow:

```text
Trip changed
  -> Mark route as stale
  -> User clicks Optimize
  -> Load current trip places
  -> Check matrix cache
  -> Fetch missing matrix
  -> Run algorithm
  -> Request Directions geometry
  -> Save new route
  -> Return updated route
```

The system should not silently optimize every small change in MVP because Matrix API calls cost money and can create confusing UX.

---

## 13. Caching Strategy

### Matrix Cache

Cache key:

```text
matrix:v1:{provider}:{profile}:{coordinate_hash}
```

Coordinate hash generation:

1. Sort or preserve coordinates depending on matrix behavior.
2. Round lat/lng to a reasonable precision.
3. Include travel profile.
4. Hash normalized string.

Important: If the matrix is order-dependent in representation, the key must match how rows/columns are built. The cached matrix must include coordinate ordering metadata.

### Directions Cache

Cache key:

```text
directions:v1:{provider}:{profile}:{ordered_coordinate_hash}
```

Directions cache is order-sensitive because route geometry depends on visit order.

---

## 14. Performance Bottlenecks

| Bottleneck | Cause | Mitigation |
|---|---|---|
| Matrix API latency | External provider request | Cache, timeout, retry |
| Matrix size | `n x n` cost matrix | Limit MVP stop count |
| Directions API latency | Geometry generation | Cache route geometry |
| Rate limits | Repeated optimization | User quotas, debounce, cache |
| Large GeoJSON | Heavy frontend rendering | Simplify geometry, encoded polyline |

MVP route stop limit recommendation:

- Free tier: 25 stops.
- Internal hard limit: 50 stops.
- Larger routes: async jobs later.

---

## 15. Realistic Scenario

User creates a Tokyo itinerary:

Stops:

1. Tokyo Station
2. Senso-ji
3. Tokyo Skytree
4. Shibuya Crossing
5. Meiji Shrine
6. Shinjuku Gyoen

Original order may jump across the city. Nearest Neighbor might group nearby eastern Tokyo locations first, then move west:

```text
Tokyo Station -> Senso-ji -> Tokyo Skytree -> Shinjuku Gyoen -> Meiji Shrine -> Shibuya Crossing
```

The result is not guaranteed globally optimal, but it is likely much better than arbitrary manual ordering.

---

## 16. Edge Cases

| Edge Case | Handling |
|---|---|
| Fewer than 2 places | Return validation error |
| Duplicate places | Prevent duplicates in `trip_places` |
| Unreachable route segment | Return partial diagnostic and avoid saving invalid route |
| Missing coordinates | Reject place before optimization |
| Matrix API timeout | Retry, then return provider error |
| Locked place order | MVP can reject or preserve manually; V2 supports constraints |
| Different travel modes | Include profile in cache key |
| Return-to-start enabled | Append start node at end |

---

## 17. Future Heuristic Upgrades

### 2-opt

2-opt improves an existing route by swapping edges when the swap reduces total cost.

Use case:

- Run Nearest Neighbor first.
- Improve result with 2-opt.
- Still fast for moderate route sizes.

### Genetic Algorithm

Genetic Algorithm evolves many candidate routes.

Good for:

- Larger search spaces.
- Multi-objective optimization.
- Preference-based scoring.

Tradeoffs:

- More complex.
- Non-deterministic unless seeded.
- Requires tuning population size, mutation rate, and generations.

### Simulated Annealing

Simulated Annealing explores route changes and sometimes accepts worse moves early to escape local minima.

Good for:

- Avoiding local greedy traps.
- Flexible constraints.

Tradeoffs:

- Needs temperature schedule tuning.
- Harder to explain to users.

---

## 18. Future Constraint Model

Advanced route planning may include:

- Opening hours.
- Required arrival time.
- Visit duration.
- Hotel start/end.
- Meal breaks.
- Locked stops.
- Preferred neighborhoods.
- Avoid tolls or highways.
- Budget constraints.

This moves Wayvora from simple TSP toward Vehicle Routing Problem with Time Windows style planning.

---

## 19. Testing the Engine

Test categories:

- Deterministic route output for known matrix.
- Handles unreachable nodes.
- Handles return-to-start.
- Handles single/zero stop validation.
- Does not mutate input arrays.
- Computes total cost correctly.
- Uses duration vs distance objective correctly.

Example matrix test:

```text
A -> B = 5
A -> C = 2
C -> B = 1
Expected route from A: A -> C -> B
```

---

## 20. Production Design Principle

The optimization engine should be written as pure domain logic where possible. Mapbox calls, database queries, NestJS decorators, and HTTP concerns should live outside the algorithm. This makes the engine testable, replaceable, and credible as a serious backend component.

