# Wayvora Frontend

Next.js frontend for the Wayvora travel route planner.

## Features

- Planner workspace for trips.
- Destination search.
- Start point selection from current location, kos, hotel, or custom place.
- Interactive MapLibre map.
- Add pinned map locations.
- Route summary with distance and duration.
- Optimize route and switch route alternatives.
- Itinerary sidebar with selected stops.

## Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- TanStack Query
- Zustand
- Axios
- MapLibre GL

## Run

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Demo planner route:

```text
http://localhost:3000/trips/demo
```

## Environment

Create `fe/.env.local` when connecting to the backend:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
```

The current planner has local/demo behavior and can run without a backend for the demo route.

## Project Structure

```text
src/
  app/
  components/
  features/
    places/
    planner/
    trips/
  lib/
  stores/
```

Important planner files:

```text
src/features/planner/components/trip-planner.tsx
src/features/planner/components/planner-map.tsx
src/features/planner/components/itinerary-sidebar.tsx
src/features/planner/components/place-search.tsx
src/features/planner/types.ts
```

## Scripts

```bash
npm run dev
npm run lint
npm run build
```

## Notes

- Frontend map rendering uses MapLibre and free map tiles for MVP.
- Route calculations currently support backend integration but demo behavior can still operate locally.
- Start point support is intended for kos, hotel, current location, or any searched/custom place.
