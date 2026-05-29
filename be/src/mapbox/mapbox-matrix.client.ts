import { Injectable } from '@nestjs/common';
import type { Place, TravelProfile } from '../trips/types/trip.types';

@Injectable()
export class MapboxMatrixClient {
  private readonly token = process.env.MAPBOX_SECRET_TOKEN;

  async getDurationMatrix(
    places: Place[],
    profile: TravelProfile,
  ): Promise<number[][] | null> {
    if (!this.token || places.length < 2) {
      return null;
    }

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
        `https://api.mapbox.com/directions-matrix/v1/${mapboxProfile[profile]}/${coordinates}?annotations=duration&access_token=${this.token}`,
        { signal: AbortSignal.timeout(10000) },
      );

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as { durations?: number[][] };
      return payload.durations ?? null;
    } catch {
      return null;
    }
  }
}
