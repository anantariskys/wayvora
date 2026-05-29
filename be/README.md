# Wayvora Backend

NestJS REST API for Wayvora.

The backend owns authentication, trip data, place search, route optimization, route generation, validation, error normalization, and future database persistence.

## Stack

- NestJS
- TypeScript
- class-validator / class-transformer
- Drizzle ORM schema
- PostgreSQL-ready `DatabaseModule`
- Mapbox Search, Matrix, and Directions adapters
- Jest + Supertest

## Run

```bash
npm install
npm run start:dev
```

Default URL:

```text
http://localhost:4000/api/v1
```

## Environment

```env
PORT=4000
CORS_ORIGIN=http://localhost:3000
JWT_ACCESS_SECRET=replace-with-a-long-local-secret
DATABASE_URL=postgres://user:password@host:5432/db
MAPBOX_SECRET_TOKEN=sk....
```

Notes:

- `DATABASE_URL` is optional right now. Drizzle schemas are present, but runtime repositories still use in-memory storage.
- `MAPBOX_SECRET_TOKEN` is optional. If missing, place search, matrix, and directions fall back to local/dev behavior.

## API Contract

Base path:

```text
/api/v1
```

All normal responses are wrapped:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "req_..."
  }
}
```

Errors are wrapped:

```json
{
  "success": false,
  "error": {
    "code": "TRIP_NOT_FOUND",
    "message": "Trip was not found or you do not have access.",
    "details": null
  },
  "meta": {
    "requestId": "req_..."
  }
}
```

## Endpoints

### Health

```text
GET /health
```

### Auth

```text
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
```

Register:

```json
{
  "email": "maya@example.com",
  "password": "Str0ngPassword!2026",
  "fullName": "Maya Santoso"
}
```

Login:

```json
{
  "email": "maya@example.com",
  "password": "Str0ngPassword!2026"
}
```

Refresh/logout:

```json
{
  "refreshToken": "..."
}
```

Protected endpoints require:

```http
Authorization: Bearer <accessToken>
```

### Trips

```text
GET    /trips?page=1&limit=20&sort=createdAt:desc&status=draft
POST   /trips
GET    /trips/:tripId
PATCH  /trips/:tripId
DELETE /trips/:tripId
```

Create trip:

```json
{
  "name": "Tokyo Spring Route",
  "description": "Four-day city itinerary.",
  "startDate": "2026-04-10",
  "endDate": "2026-04-14"
}
```

### Trip Places

```text
POST  /trips/:tripId/places
PATCH /trips/:tripId/places/reorder
```

Add place:

```json
{
  "place": {
    "provider": "mapbox",
    "providerPlaceId": "poi.123456789",
    "name": "Shibuya Crossing",
    "address": "Shibuya City, Tokyo, Japan",
    "city": "Tokyo",
    "country": "Japan",
    "latitude": 35.6595,
    "longitude": 139.7004,
    "category": "landmark"
  },
  "notes": "Best around sunset.",
  "dayNumber": 1
}
```

Reorder:

```json
{
  "orderedTripPlaceIds": [
    "trip-place-id-1",
    "trip-place-id-2"
  ]
}
```

### Places

```text
GET /places/search?q=Shibuya&proximity=139.7004,35.6595&limit=5
```

Uses Mapbox when `MAPBOX_SECRET_TOKEN` exists, otherwise local seeded fallback data.

### Optimization

```text
POST /trips/:tripId/optimize
POST /trips/:tripId/routes/generate
```

Optimize with a kos/hotel/custom start point:

```json
{
  "profile": "driving",
  "returnToStart": false,
  "respectLockedPlaces": true,
  "startPoint": {
    "provider": "maplibre",
    "providerPlaceId": "kos:jakarta-selatan",
    "name": "Kos Jakarta Selatan",
    "address": "Jakarta Selatan",
    "city": "Jakarta",
    "country": "Indonesia",
    "latitude": -6.2297,
    "longitude": 106.8217,
    "category": "lodging"
  }
}
```

Generate route from current/manual order:

```json
{
  "profile": "walking",
  "orderedTripPlaceIds": [
    "trip-place-id-1",
    "trip-place-id-2"
  ]
}
```

## Modules

```text
src/
  auth/
  common/
  database/
  health/
  mapbox/
  optimization/
  places/
  trips/
```

## Database

Drizzle schemas exist in:

```text
src/database/schema/
```

Covered tables:

- `users`
- `refresh_tokens`
- `trips`
- `places`
- `trip_places`
- `routes`
- `cached_distance_matrices`

Runtime persistence still needs Drizzle-backed repository implementations.

## Tests

```bash
npm run lint
npx tsc --noEmit
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run build
```

The e2e suite covers health and the core authenticated planning flow:

```text
register -> refresh -> create trip -> list trips -> add places -> optimize from start point
```
