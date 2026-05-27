# Wayvora Database Design Document

Stack: Neon PostgreSQL, Drizzle ORM  
Future-ready for: PostGIS, spatial indexes, radius search, nearby queries

---

## 1. Database Goals

The database design must support:

- Authenticated users.
- User-owned trips.
- Places and trip-specific place ordering.
- Generated routes and optimization metadata.
- Favorites, reviews, collaborators.
- AI recommendation history.
- Cached distance matrices.
- Future geospatial queries.

PostgreSQL is used as the primary system of record.

---

## 2. Why PostgreSQL Over MySQL

| Reason | PostgreSQL Advantage |
|---|---|
| Geospatial future | PostGIS is the industry-standard spatial extension |
| Complex data | Strong JSONB support for provider metadata |
| Query power | Window functions, CTEs, advanced indexes |
| Constraints | Rich relational integrity |
| SaaS maturity | Excellent for transactional and analytical hybrid workloads |
| Ecosystem | Strong compatibility with Neon and Drizzle |

MySQL can support many CRUD workloads, but PostgreSQL is a better strategic choice for a geospatial route-planning platform.

---

## 3. Why Drizzle Over Prisma

| Dimension | Drizzle | Prisma |
|---|---|---|
| SQL control | Very high | Abstracted |
| Type safety | Strong TypeScript inference | Strong generated client |
| Runtime weight | Lightweight | Heavier client/runtime |
| Query predictability | SQL-like and explicit | ORM abstraction |
| Migration style | SQL-friendly | Prisma migration workflow |
| Advanced PostgreSQL | Easier to stay close to SQL | Sometimes requires raw SQL |

Drizzle is chosen because Wayvora benefits from explicit SQL control, type safety, and predictable performance. This matters for geospatial indexing, matrix cache lookups, and route-related queries.

---

## 4. Why Neon

Neon PostgreSQL is chosen because:

- Serverless-friendly Postgres.
- Branching is useful for preview environments.
- Managed backups and scaling characteristics.
- Good developer experience.
- Compatible with pooled connections.
- Strong fit for Vercel/Railway style deployments.

Operational considerations:

- Use pooled connection URLs for serverless or short-lived runtimes.
- Use direct connection URLs for migrations when recommended.
- Keep migrations deterministic and source-controlled.

---

## 5. ERD

```text
users
  1 ─── * trips
  1 ─── * favorites
  1 ─── * reviews
  1 ─── * trip_collaborators
  1 ─── * ai_recommendations

trips
  1 ─── * trip_places
  1 ─── * routes
  1 ─── * trip_collaborators
  1 ─── * ai_recommendations

places
  1 ─── * trip_places
  1 ─── * favorites
  1 ─── * reviews

routes
  * ─── 1 trips

cached_distance_matrices
  keyed by profile + coordinate hash
```

---

## 6. Normalized Schema Overview

| Table | Purpose |
|---|---|
| `users` | Accounts, roles, profile fields |
| `refresh_tokens` | Rotating refresh token sessions |
| `trips` | User-owned trip containers |
| `places` | Canonical destination/place records |
| `trip_places` | Places attached to trips with order and notes |
| `routes` | Generated optimized route results |
| `favorites` | User saved places |
| `reviews` | User notes/reviews for places |
| `trip_collaborators` | Shared trip access |
| `ai_recommendations` | Future recommendation outputs |
| `cached_distance_matrices` | Matrix API cache |

---

## 7. PostgreSQL Schema Examples

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

```sql
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  visibility TEXT NOT NULL DEFAULT 'private',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT trips_name_length CHECK (char_length(name) BETWEEN 2 AND 120)
);

CREATE INDEX trips_owner_created_idx ON trips(owner_id, created_at DESC);
```

```sql
CREATE TABLE places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'mapbox',
  provider_place_id TEXT,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  country TEXT,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  category TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT places_latitude_range CHECK (latitude >= -90 AND latitude <= 90),
  CONSTRAINT places_longitude_range CHECK (longitude >= -180 AND longitude <= 180)
);

CREATE INDEX places_provider_id_idx ON places(provider, provider_place_id);
CREATE INDEX places_lat_lng_idx ON places(latitude, longitude);
```

```sql
CREATE TABLE trip_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  place_id UUID NOT NULL REFERENCES places(id) ON DELETE RESTRICT,
  position INTEGER NOT NULL,
  day_number INTEGER,
  arrival_time TIME,
  departure_time TIME,
  notes TEXT,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trip_id, place_id),
  UNIQUE (trip_id, position)
);

CREATE INDEX trip_places_trip_position_idx ON trip_places(trip_id, position);
```

```sql
CREATE TABLE routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  profile TEXT NOT NULL DEFAULT 'driving',
  algorithm TEXT NOT NULL,
  ordered_trip_place_ids UUID[] NOT NULL,
  total_distance_meters INTEGER NOT NULL,
  total_duration_seconds INTEGER NOT NULL,
  geometry JSONB,
  encoded_polyline TEXT,
  matrix_cache_key TEXT,
  optimization_metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX routes_trip_created_idx ON routes(trip_id, created_at DESC);
```

```sql
CREATE TABLE cached_distance_matrices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  profile TEXT NOT NULL,
  coordinate_hash TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'mapbox',
  matrix JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX cached_distance_matrices_lookup_idx
  ON cached_distance_matrices(profile, coordinate_hash);

CREATE INDEX cached_distance_matrices_expiry_idx
  ON cached_distance_matrices(expires_at);
```

---

## 8. Drizzle ORM Schema Examples

```ts
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull(),
  role: text('role').notNull().default('user'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

```ts
export const trips = pgTable(
  'trips',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id').notNull().references(() => users.id, {
      onDelete: 'cascade',
    }),
    name: text('name').notNull(),
    description: text('description'),
    startDate: date('start_date'),
    endDate: date('end_date'),
    status: text('status').notNull().default('draft'),
    visibility: text('visibility').notNull().default('private'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerCreatedIdx: index('trips_owner_created_idx').on(
      table.ownerId,
      table.createdAt,
    ),
  }),
);
```

```ts
export const tripPlaces = pgTable(
  'trip_places',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id').notNull().references(() => trips.id, {
      onDelete: 'cascade',
    }),
    placeId: uuid('place_id').notNull().references(() => places.id, {
      onDelete: 'restrict',
    }),
    position: integer('position').notNull(),
    dayNumber: integer('day_number'),
    notes: text('notes'),
    isLocked: boolean('is_locked').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tripPositionIdx: index('trip_places_trip_position_idx').on(
      table.tripId,
      table.position,
    ),
    uniqueTripPlace: unique().on(table.tripId, table.placeId),
    uniqueTripPosition: unique().on(table.tripId, table.position),
  }),
);
```

---

## 9. Table Details

### users

Stores account identity and global role.

Indexes:

- `email` unique.
- Optional `role` index for admin dashboards.

### trips

Stores trip metadata. Does not store places inline.

Indexes:

- `(owner_id, created_at DESC)` for dashboard trip list.
- `(status)` if status filtering becomes common.

### places

Canonical places can be reused across trips. Provider metadata is stored in JSONB, but core fields are relational.

Future PostGIS:

```sql
ALTER TABLE places ADD COLUMN geom geometry(Point, 4326);
UPDATE places SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326);
CREATE INDEX places_geom_gix ON places USING GIST (geom);
```

### trip_places

Join table that captures trip-specific ordering and notes.

Important fields:

- `position` for itinerary order.
- `day_number` for multi-day planning.
- `is_locked` for future optimization constraints.

### routes

Stores generated output from optimization:

- ordered trip place IDs.
- algorithm name.
- route geometry.
- total distance and duration.
- metadata such as cache hits and optimization time.

### cached_distance_matrices

Prevents repeated calls to Mapbox Matrix API for the same coordinate set.

Cache key input:

```text
profile + normalized coordinates + provider + matrix options
```

Coordinates should be rounded carefully. Too much precision lowers cache hits; too little precision can create inaccurate results.

---

## 10. Query Optimization

Common query: load trip planner.

```sql
SELECT
  tp.id AS trip_place_id,
  tp.position,
  tp.notes,
  p.id AS place_id,
  p.name,
  p.latitude,
  p.longitude,
  p.address
FROM trip_places tp
JOIN places p ON p.id = tp.place_id
WHERE tp.trip_id = $1
ORDER BY tp.position ASC;
```

Required index:

```sql
CREATE INDEX trip_places_trip_position_idx
ON trip_places(trip_id, position);
```

Common query: user trip dashboard.

```sql
SELECT *
FROM trips
WHERE owner_id = $1
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;
```

Required index:

```sql
CREATE INDEX trips_owner_created_idx
ON trips(owner_id, created_at DESC);
```

---

## 11. Constraints and Integrity

Key constraints:

- Unique user email.
- Trip must reference valid owner.
- Trip place must reference valid trip and place.
- One place should not appear twice in the same trip unless product later supports duplicate visits.
- Position should be unique per trip.
- Latitude/longitude range checks.

Soft delete vs hard delete:

- MVP can hard delete user-owned trips with cascading child records.
- For production SaaS, consider soft delete for audit, recovery, and billing-related data.

---

## 12. Migration Strategy

Migration principles:

- All schema changes are committed.
- Migrations run in CI against a disposable database.
- Production migrations are backward-compatible when possible.
- Large data migrations are separated from schema migrations.

Process:

```text
1. Modify Drizzle schema.
2. Generate migration.
3. Review generated SQL.
4. Run migration locally.
5. Run tests.
6. Apply to staging.
7. Apply to production.
```

---

## 13. Future PostGIS Integration

PostGIS unlocks:

- Radius search.
- Nearby recommendations.
- Bounding box filtering.
- Spatial clustering.
- Geofencing.
- Route proximity analysis.

Example nearby query:

```sql
SELECT id, name
FROM places
WHERE ST_DWithin(
  geom::geography,
  ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
  3000
)
ORDER BY ST_Distance(
  geom::geography,
  ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
)
LIMIT 20;
```

This is why PostgreSQL is the correct long-term database choice.

