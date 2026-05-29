import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthUser } from '../auth/types/auth.types';
import { MapboxDirectionsClient } from '../mapbox/mapbox-directions.client';
import { TripsService } from '../trips/trips.service';
import type {
  OptimizedRoute,
  Place,
  TravelProfile,
  TripPlace,
} from '../trips/types/trip.types';
import {
  DistanceMatrixService,
  estimateDurationSeconds,
  getDistanceMeters,
} from './distance-matrix.service';
import type {
  GenerateRouteDto,
  OptimizeTripDto,
} from './dto/optimize-trip.dto';
import { NearestNeighborStrategy } from './nearest-neighbor.strategy';

@Injectable()
export class OptimizationService {
  constructor(
    private readonly tripsService: TripsService,
    private readonly distanceMatrixService: DistanceMatrixService,
    private readonly nearestNeighborStrategy: NearestNeighborStrategy,
    private readonly mapboxDirectionsClient: MapboxDirectionsClient,
  ) {}

  async optimizeTrip(user: AuthUser, tripId: string, dto: OptimizeTripDto) {
    const trip = this.tripsService.findForUser(user, tripId);
    const profile = this.normalizeProfile(dto.profile);
    const startPoint = dto.startPoint
      ? this.normalizeStartPoint(dto.startPoint)
      : null;

    if (trip.places.length < 2 && !startPoint) {
      throw new BadRequestException(
        'At least two places are required to optimize a trip.',
      );
    }

    const virtualStartPlace = startPoint
      ? this.toVirtualTripPlace(startPoint)
      : null;
    const stopsForMatrix = virtualStartPlace
      ? [virtualStartPlace, ...trip.places]
      : trip.places;
    const startIndex = virtualStartPlace
      ? 0
      : this.findStartIndex(trip.places, dto.startTripPlaceId);
    const matrixResult = await this.distanceMatrixService.buildDurationMatrix(
      stopsForMatrix.map((item) => item.place),
      profile,
    );
    const result = this.nearestNeighborStrategy.optimize({
      stops: stopsForMatrix,
      costMatrix: matrixResult.matrix,
      startIndex,
      returnToStart: dto.returnToStart ?? false,
    });
    const orderedStops = result.orderedStopIndexes
      .map((index) => stopsForMatrix[index])
      .filter((item) => item.tripPlaceId !== '__start_point__');
    const route = await this.buildRoute({
      tripId,
      profile,
      startPoint,
      orderedStops,
      optimizationRuntimeMs: result.runtimeMs,
      matrixCacheHit: matrixResult.cacheHit,
      providerRuntimeMs: matrixResult.providerRuntimeMs,
    });

    return this.tripsService.saveRoute(user, tripId, route);
  }

  async generateRoute(user: AuthUser, tripId: string, dto: GenerateRouteDto) {
    const trip = this.tripsService.findForUser(user, tripId);
    const profile = this.normalizeProfile(dto.profile);
    const startPoint = dto.startPoint
      ? this.normalizeStartPoint(dto.startPoint)
      : null;
    const orderedStops = dto.orderedTripPlaceIds
      ? dto.orderedTripPlaceIds.map((id) => {
          const stop = trip.places.find((item) => item.tripPlaceId === id);

          if (!stop) {
            throw new BadRequestException(`Unknown trip place id: ${id}`);
          }

          return stop;
        })
      : trip.places;

    if (orderedStops.length < 1) {
      throw new BadRequestException(
        'At least one place is required to generate a route.',
      );
    }

    const route = await this.buildRoute({
      tripId,
      profile,
      startPoint,
      orderedStops,
      optimizationRuntimeMs: 0,
      matrixCacheHit: false,
      providerRuntimeMs: 0,
    });

    return this.tripsService.saveRoute(user, tripId, route);
  }

  private async buildRoute(input: {
    tripId: string;
    profile: TravelProfile;
    startPoint: Place | null;
    orderedStops: TripPlace[];
    optimizationRuntimeMs: number;
    matrixCacheHit: boolean;
    providerRuntimeMs: number;
  }): Promise<OptimizedRoute> {
    const orderedStops = input.orderedStops.map((item, index) => ({
      ...item,
      position: index + 1,
      durationFromPreviousSeconds:
        index === 0 && !input.startPoint
          ? undefined
          : estimateDurationSeconds(
              index === 0 && input.startPoint
                ? input.startPoint
                : input.orderedStops[index - 1].place,
              item.place,
              input.profile,
            ),
    }));
    const coordinates = [
      ...(input.startPoint
        ? [
            [input.startPoint.longitude, input.startPoint.latitude] as [
              number,
              number,
            ],
          ]
        : []),
      ...orderedStops.map(
        (item) =>
          [item.place.longitude, item.place.latitude] as [number, number],
      ),
    ];
    const fallbackDurationSeconds = orderedStops.reduce(
      (total, item) => total + (item.durationFromPreviousSeconds ?? 0),
      0,
    );
    const fallbackDistanceMeters = getRouteDistanceMeters(
      orderedStops,
      input.startPoint,
    );
    const routePlaces = [
      ...(input.startPoint ? [input.startPoint] : []),
      ...orderedStops.map((item) => item.place),
    ];
    const directions = await this.mapboxDirectionsClient.getRouteGeometry(
      routePlaces,
      input.profile,
    );
    const totalDistanceMeters =
      directions?.distanceMeters ?? fallbackDistanceMeters;
    const totalDurationSeconds =
      directions?.durationSeconds ?? fallbackDurationSeconds;
    const routeCoordinates = directions?.coordinates ?? coordinates;
    const providerRuntimeMs =
      input.providerRuntimeMs + (directions?.providerRuntimeMs ?? 0);

    return {
      routeId: randomUUID(),
      tripId: input.tripId,
      algorithm: 'nearest_neighbor',
      profile: input.profile,
      startPoint: input.startPoint,
      orderedStops,
      alternatives: [
        {
          index: 0,
          label: 'Recommended',
          totalDistanceMeters,
          totalDurationSeconds,
          geometry: {
            type: 'LineString',
            coordinates: routeCoordinates,
          },
        },
      ],
      activeAlternativeIndex: 0,
      summary: {
        totalDistanceMeters,
        totalDurationSeconds,
        matrixCacheHit: input.matrixCacheHit,
        optimizationRuntimeMs: input.optimizationRuntimeMs,
        providerRuntimeMs,
      },
      geometry: {
        type: 'LineString',
        coordinates: routeCoordinates,
      },
    };
  }

  private findStartIndex(
    stops: TripPlace[],
    startTripPlaceId?: string,
  ): number {
    if (!startTripPlaceId) {
      return 0;
    }

    const index = stops.findIndex(
      (stop) => stop.tripPlaceId === startTripPlaceId,
    );

    if (index === -1) {
      throw new BadRequestException(
        'startTripPlaceId was not found in this trip.',
      );
    }

    return index;
  }

  private normalizeProfile(profile?: TravelProfile): TravelProfile {
    if (!profile) {
      return 'driving';
    }

    if (!['driving', 'walking', 'cycling'].includes(profile)) {
      throw new BadRequestException(
        'profile must be driving, walking, or cycling.',
      );
    }

    return profile;
  }

  private normalizeStartPoint(
    place: Omit<Place, 'id'> & { id?: string },
  ): Place {
    if (
      !place.name ||
      typeof place.latitude !== 'number' ||
      typeof place.longitude !== 'number'
    ) {
      throw new BadRequestException(
        'startPoint requires name, latitude, and longitude.',
      );
    }

    return {
      id: place.id ?? 'start_point',
      provider: place.provider ?? 'maplibre',
      providerPlaceId:
        place.providerPlaceId ?? `start:${place.longitude},${place.latitude}`,
      name: place.name,
      address: place.address ?? '',
      city: place.city ?? '',
      country: place.country ?? '',
      latitude: place.latitude,
      longitude: place.longitude,
      category: place.category ?? 'start point',
    };
  }

  private toVirtualTripPlace(place: Place): TripPlace {
    return {
      tripPlaceId: '__start_point__',
      position: 0,
      dayNumber: 1,
      isLocked: true,
      place,
    };
  }
}

function getRouteDistanceMeters(stops: TripPlace[], startPoint: Place | null) {
  const routePlaces = [
    ...(startPoint ? [startPoint] : []),
    ...stops.map((item) => item.place),
  ];

  return Math.round(
    routePlaces.reduce((total, item, index) => {
      if (index === 0) {
        return total;
      }

      return total + getDistanceMeters(routePlaces[index - 1], item);
    }, 0),
  );
}
