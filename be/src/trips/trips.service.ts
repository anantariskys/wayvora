import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  HttpStatus,
} from '@nestjs/common';
import type { AuthUser } from '../auth/types/auth.types';
import { AppException } from '../common/errors/app-exception';
import type { AddTripPlaceDto } from './dto/add-trip-place.dto';
import type { CreateTripDto } from './dto/create-trip.dto';
import type { ListTripsQuery } from './dto/list-trips.query';
import type { ReorderTripPlacesDto } from './dto/reorder-trip-places.dto';
import type { UpdateTripDto } from './dto/update-trip.dto';
import { TripsRepository } from './trips.repository';
import type { OptimizedRoute, Trip } from './types/trip.types';

@Injectable()
export class TripsService {
  constructor(private readonly tripsRepository: TripsRepository) {}

  create(user: AuthUser, dto: CreateTripDto): Trip {
    this.assertTripDto(dto);
    return this.tripsRepository.create(user.id, dto);
  }

  list(user: AuthUser, query: ListTripsQuery) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const [sortField = 'createdAt', sortDirection = 'desc'] =
      query.sort?.split(':') ?? [];
    const sortableFields = new Set(['createdAt', 'name']);

    if (!Number.isFinite(page) || !Number.isFinite(limit)) {
      throw new BadRequestException('page and limit must be valid numbers.');
    }

    if (
      !sortableFields.has(sortField) ||
      !['asc', 'desc'].includes(sortDirection)
    ) {
      throw new BadRequestException(
        'sort must be createdAt:asc, createdAt:desc, name:asc, or name:desc.',
      );
    }

    const filtered = this.tripsRepository
      .findByOwner(user.id)
      .filter((trip) => (query.status ? trip.status === query.status : true))
      .sort((a, b) => {
        const left = sortField === 'name' ? a.name : a.createdAt;
        const right = sortField === 'name' ? b.name : b.createdAt;
        const result = left.localeCompare(right);
        return sortDirection === 'asc' ? result : -result;
      });
    const total = filtered.length;
    const offset = (page - 1) * limit;

    return {
      data: filtered.slice(offset, offset + limit).map((trip) => ({
        id: trip.id,
        name: trip.name,
        description: trip.description,
        status: trip.status,
        visibility: trip.visibility,
        placeCount: trip.places.length,
        lastOptimizedAt: trip.latestRoute ? trip.updatedAt : null,
        createdAt: trip.createdAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  findForUser(user: AuthUser, tripId: string): Trip {
    const trip = this.tripsRepository.findById(tripId);

    if (!trip) {
      throw new AppException(
        'TRIP_NOT_FOUND',
        'Trip was not found or you do not have access.',
        HttpStatus.NOT_FOUND,
      );
    }

    if (trip.ownerId !== user.id && user.role !== 'admin') {
      throw new ForbiddenException('You do not have access to this trip.');
    }

    return trip;
  }

  update(user: AuthUser, tripId: string, dto: UpdateTripDto): Trip {
    this.findForUser(user, tripId);
    const updated = this.tripsRepository.update(tripId, dto);

    if (!updated) {
      throw new AppException(
        'TRIP_NOT_FOUND',
        'Trip was not found or you do not have access.',
        HttpStatus.NOT_FOUND,
      );
    }

    return updated;
  }

  delete(user: AuthUser, tripId: string): void {
    this.findForUser(user, tripId);
    this.tripsRepository.delete(tripId);
  }

  addPlace(user: AuthUser, tripId: string, dto: AddTripPlaceDto) {
    const trip = this.findForUser(user, tripId);
    this.assertPlaceDto(dto);

    const alreadyExists = trip.places.some(
      (item) =>
        item.place.provider === dto.place.provider &&
        item.place.providerPlaceId === dto.place.providerPlaceId,
    );

    if (alreadyExists) {
      throw new AppException(
        'PLACE_ALREADY_EXISTS',
        'Place already exists in this trip.',
        HttpStatus.CONFLICT,
      );
    }

    const tripPlace = this.tripsRepository.addPlace(tripId, dto);

    if (!tripPlace) {
      throw new AppException(
        'TRIP_NOT_FOUND',
        'Trip was not found or you do not have access.',
        HttpStatus.NOT_FOUND,
      );
    }

    return tripPlace;
  }

  reorderPlaces(user: AuthUser, tripId: string, dto: ReorderTripPlacesDto) {
    const trip = this.findForUser(user, tripId);

    if (!Array.isArray(dto.orderedTripPlaceIds)) {
      throw new BadRequestException('orderedTripPlaceIds must be an array.');
    }

    const idSet = new Set(dto.orderedTripPlaceIds);

    if (idSet.size !== trip.places.length) {
      throw new BadRequestException(
        'Reorder payload must include every place once.',
      );
    }

    const reordered = dto.orderedTripPlaceIds.map((id) => {
      const place = trip.places.find((item) => item.tripPlaceId === id);

      if (!place) {
        throw new BadRequestException(`Unknown trip place id: ${id}`);
      }

      return place;
    });

    return this.tripsRepository.replacePlaces(tripId, reordered);
  }

  saveRoute(user: AuthUser, tripId: string, route: OptimizedRoute) {
    this.findForUser(user, tripId);
    return this.tripsRepository.saveRoute(tripId, route);
  }

  private assertTripDto(dto: CreateTripDto): void {
    if (!dto.name || dto.name.trim().length < 2 || dto.name.length > 120) {
      throw new BadRequestException(
        'Trip name must be between 2 and 120 characters.',
      );
    }
  }

  private assertPlaceDto(dto: AddTripPlaceDto): void {
    const place = dto.place;

    if (!place?.name || !place.provider || !place.providerPlaceId) {
      throw new BadRequestException(
        'Place provider, providerPlaceId, and name are required.',
      );
    }

    if (
      typeof place.latitude !== 'number' ||
      place.latitude < -90 ||
      place.latitude > 90 ||
      typeof place.longitude !== 'number' ||
      place.longitude < -180 ||
      place.longitude > 180
    ) {
      throw new BadRequestException('Place coordinates are invalid.');
    }
  }
}
