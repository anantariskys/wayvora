import { Injectable } from '@nestjs/common';
import type { Place, TravelProfile } from '../trips/types/trip.types';

@Injectable()
export class MapboxDirectionsClient {
  private readonly token = process.env.MAPBOX_SECRET_TOKEN;

  async getRouteGeometry(
    places: Place[],
    profile: TravelProfile,
  ): Promise<{
    coordinates: [number, number][];
    distanceMeters: number;
    durationSeconds: number;
    providerRuntimeMs: number;
  } | null> {
    if (!this.token || places.length < 2) {
      return null;
    }

    const startedAt = performance.now();
    const coordinates = places
      .map((place) => `${place.longitude},${place.latitude}`)
      .join(';');
    const mapboxProfile = {
      driving: 'mapbox/driving',
      walking: 'mapbox/walking',
      cycling: 'mapbox/cycling',
    } satisfies Record<TravelProfile, string>;
    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/${mapboxProfile[profile]}/${coordinates}?geometries=geojson&overview=full&access_token=${this.token}`,
        { signal: AbortSignal.timeout(10000) },
      );

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as {
        routes?: Array<{
          distance: number;
          duration: number;
          geometry: { coordinates: [number, number][] };
        }>;
      };
      const route = payload.routes?.[0];

      if (!route) {
        return null;
      }

      return {
        coordinates: route.geometry.coordinates,
        distanceMeters: Math.round(route.distance),
        durationSeconds: Math.round(route.duration),
        providerRuntimeMs: Math.round(performance.now() - startedAt),
      };
    } catch {
      return null;
    }
  }
}
