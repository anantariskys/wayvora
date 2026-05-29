import { Injectable } from '@nestjs/common';
import { MapboxMatrixClient } from '../mapbox/mapbox-matrix.client';
import type { Place, TravelProfile } from '../trips/types/trip.types';

@Injectable()
export class DistanceMatrixService {
  constructor(private readonly mapboxMatrixClient: MapboxMatrixClient) {}

  async buildDurationMatrix(
    places: Place[],
    profile: TravelProfile,
  ): Promise<{
    matrix: number[][];
    cacheHit: boolean;
    providerRuntimeMs: number;
  }> {
    const startedAt = performance.now();
    const mapboxMatrix = await this.mapboxMatrixClient.getDurationMatrix(
      places,
      profile,
    );

    if (mapboxMatrix) {
      return {
        matrix: mapboxMatrix,
        cacheHit: false,
        providerRuntimeMs: Math.round(performance.now() - startedAt),
      };
    }

    return {
      matrix: places.map((origin) =>
        places.map((destination) =>
          origin === destination
            ? 0
            : estimateDurationSeconds(origin, destination, profile),
        ),
      ),
      cacheHit: false,
      providerRuntimeMs: 0,
    };
  }
}

export function estimateDurationSeconds(
  origin: Pick<Place, 'latitude' | 'longitude'>,
  destination: Pick<Place, 'latitude' | 'longitude'>,
  profile: TravelProfile,
) {
  const distanceMeters = getDistanceMeters(origin, destination);
  const speedMetersPerSecond = {
    driving: 9.7,
    cycling: 4.2,
    walking: 1.4,
  } satisfies Record<TravelProfile, number>;

  return Math.round(distanceMeters / speedMetersPerSecond[profile]);
}

export function getDistanceMeters(
  origin: Pick<Place, 'latitude' | 'longitude'>,
  destination: Pick<Place, 'latitude' | 'longitude'>,
) {
  const earthRadiusMeters = 6_371_000;
  const originLat = toRadians(origin.latitude);
  const destinationLat = toRadians(destination.latitude);
  const deltaLat = toRadians(destination.latitude - origin.latitude);
  const deltaLng = toRadians(destination.longitude - origin.longitude);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(originLat) *
      Math.cos(destinationLat) *
      Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
