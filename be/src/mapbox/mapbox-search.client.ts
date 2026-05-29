import { Injectable } from '@nestjs/common';
import type { Place } from '../trips/types/trip.types';

type MapboxFeature = {
  id: string;
  properties?: {
    name?: string;
    full_address?: string;
    feature_type?: string;
    context?: {
      place?: { name?: string };
      country?: { name?: string };
    };
    coordinates?: {
      latitude?: number;
      longitude?: number;
    };
  };
  geometry?: {
    coordinates?: [number, number];
  };
};

@Injectable()
export class MapboxSearchClient {
  private readonly token = process.env.MAPBOX_SECRET_TOKEN;

  async search(input: {
    query: string;
    proximity?: { latitude: number; longitude: number } | null;
    limit: number;
  }): Promise<Place[] | null> {
    if (!this.token) {
      return null;
    }

    const params = new URLSearchParams({
      access_token: this.token,
      limit: String(input.limit),
      language: 'en',
    });

    if (input.proximity) {
      params.set(
        'proximity',
        `${input.proximity.longitude},${input.proximity.latitude}`,
      );
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(
          input.query,
        )}&${params.toString()}`,
        { signal: AbortSignal.timeout(8000) },
      );

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as { features?: MapboxFeature[] };

      return (payload.features ?? []).map((feature) => {
        const coordinates =
          feature.properties?.coordinates ??
          (feature.geometry?.coordinates
            ? {
                longitude: feature.geometry.coordinates[0],
                latitude: feature.geometry.coordinates[1],
              }
            : null);

        return {
          id: feature.id,
          provider: 'mapbox',
          providerPlaceId: feature.id,
          name: feature.properties?.name ?? 'Unnamed place',
          address: feature.properties?.full_address ?? '',
          city: feature.properties?.context?.place?.name ?? '',
          country: feature.properties?.context?.country?.name ?? '',
          latitude: coordinates?.latitude ?? 0,
          longitude: coordinates?.longitude ?? 0,
          category: feature.properties?.feature_type ?? 'place',
        };
      });
    } catch {
      return null;
    }
  }
}
