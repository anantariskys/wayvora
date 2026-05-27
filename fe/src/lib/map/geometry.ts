import type { TripPlace } from "@/features/planner/types";

export function getRouteCoordinates(places: TripPlace[]): [number, number][] {
  return places.map((item) => [item.place.longitude, item.place.latitude]);
}

export function getBounds(coordinates: [number, number][]) {
  return coordinates.reduce(
    (bounds, [lng, lat]) => ({
      minLng: Math.min(bounds.minLng, lng),
      maxLng: Math.max(bounds.maxLng, lng),
      minLat: Math.min(bounds.minLat, lat),
      maxLat: Math.max(bounds.maxLat, lat),
    }),
    {
      minLng: coordinates[0]?.[0] ?? 0,
      maxLng: coordinates[0]?.[0] ?? 0,
      minLat: coordinates[0]?.[1] ?? 0,
      maxLat: coordinates[0]?.[1] ?? 0,
    },
  );
}
