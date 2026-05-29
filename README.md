# Wayvora

Wayvora is a separated fullstack travel route planning app. It helps users collect destinations, choose a start point such as a kos, hotel, or current location, optimize the visit order, and visualize the route on a map.

The project is split into two services:

- `fe`: Next.js frontend planner UI.
- `be`: NestJS REST API for auth, trips, places, routes, and route optimization.

Architecture and product documents live in `docs/`.

## Current Status

Implemented:

- Frontend planner workspace with map, itinerary sidebar, start point selection, route preview, and alternatives UI.
- Backend `/api/v1` REST API with response envelope.
- Register, login, refresh, logout.
- Bearer access token guard.
- Trip CRUD, add place, reorder place.
- Place search with Mapbox adapter and local fallback.
- Route optimization with nearest-neighbor strategy.
- Route generation from current/manual order.
- Drizzle schema definitions for future PostgreSQL persistence.
- Unit and e2e tests for backend core flow.

Still in progress:

- Runtime repositories still use in-memory storage unless replaced with Drizzle-backed repositories.
- Collaborators, favorites, reviews, and AI recommendations are documented but not implemented yet.
- Matrix/directions cache table exists in schema, but cache lookup/write is not wired yet.

## Tech Stack

Frontend:

- Next.js
- React
- TypeScript
- Tailwind CSS
- TanStack Query
- Zustand
- MapLibre GL

Backend:

- NestJS
- TypeScript
- class-validator / class-transformer
- Drizzle ORM schema
- PostgreSQL-ready adapter
- Mapbox API adapters with local fallback

## Project Structure

```text
wayvora/
  docs/    Product, system, API, database, security, testing docs
  fe/      Next.js frontend
  be/      NestJS backend API
```

## Requirements

- Node.js 20+
- npm
- Optional: PostgreSQL/Neon `DATABASE_URL`
- Optional: Mapbox secret token `MAPBOX_SECRET_TOKEN`

## Install

```bash
cd fe
npm install

cd ../be
npm install
```

## Run Locally

Start the backend:

```bash
cd be
npm run start:dev
```

Backend runs on:

```text
http://localhost:4000/api/v1
```

Start the frontend:

```bash
cd fe
npm run dev
```

Frontend runs on:

```text
http://localhost:3000
```

## Backend Environment

Create `be/.env` if needed:

```env
PORT=4000
CORS_ORIGIN=http://localhost:3000
JWT_ACCESS_SECRET=replace-with-a-long-local-secret
DATABASE_URL=postgres://user:password@host:5432/db
MAPBOX_SECRET_TOKEN=sk....
```

`DATABASE_URL` and `MAPBOX_SECRET_TOKEN` are optional for local development. Without them, the API uses in-memory storage and local fallback route/place behavior.

## Main API Endpoints

Base URL:

```text
/api/v1
```

Auth:

```text
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
```

Trips:

```text
GET    /trips?page=1&limit=20&sort=createdAt:desc&status=draft
POST   /trips
GET    /trips/:tripId
PATCH  /trips/:tripId
DELETE /trips/:tripId
POST   /trips/:tripId/places
PATCH  /trips/:tripId/places/reorder
POST   /trips/:tripId/optimize
POST   /trips/:tripId/routes/generate
```

Places:

```text
GET /places/search?q=Shibuya&proximity=139.7004,35.6595&limit=5
```

Health:

```text
GET /health
```

## API Response Shape

Success:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "req_..."
  }
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": []
  },
  "meta": {
    "requestId": "req_..."
  }
}
```

## Verification

Backend:

```bash
cd be
npm run lint
npx tsc --noEmit
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run build
```

Frontend:

```bash
cd fe
npm run lint
npx tsc --noEmit
npm run build
```

## Documentation

Start with:

- `docs/01-product-requirements-document.md`
- `docs/02-system-design-document.md`
- `docs/03-backend-architecture-document.md`
- `docs/05-database-design-document.md`
- `docs/06-api-specification-document.md`
- `docs/07-route-optimization-engine-document.md`

