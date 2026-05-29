import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AddTripPlaceDto } from './dto/add-trip-place.dto';
import type { CreateTripDto } from './dto/create-trip.dto';
import type { UpdateTripDto } from './dto/update-trip.dto';
import type { OptimizedRoute, Trip, TripPlace } from './types/trip.types';

@Injectable()
export class TripsRepository {
  private readonly trips = new Map<string, Trip>();

  create(ownerId: string, dto: CreateTripDto): Trip {
    const now = new Date().toISOString();
    const trip: Trip = {
      id: randomUUID(),
      ownerId,
      name: dto.name.trim(),
      description: dto.description?.trim() ?? '',
      status: 'draft',
      visibility: 'private',
      startDate: dto.startDate,
      endDate: dto.endDate,
      places: [],
      latestRoute: null,
      createdAt: now,
      updatedAt: now,
    };

    this.trips.set(trip.id, trip);
    return trip;
  }

  findById(tripId: string): Trip | null {
    return this.trips.get(tripId) ?? null;
  }

  findByOwner(ownerId: string): Trip[] {
    return [...this.trips.values()]
      .filter((trip) => trip.ownerId === ownerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  update(tripId: string, dto: UpdateTripDto): Trip | null {
    const trip = this.findById(tripId);

    if (!trip) {
      return null;
    }

    const updated: Trip = {
      ...trip,
      ...dto,
      name: dto.name?.trim() ?? trip.name,
      description: dto.description?.trim() ?? trip.description,
      updatedAt: new Date().toISOString(),
    };

    this.trips.set(tripId, updated);
    return updated;
  }

  delete(tripId: string): boolean {
    return this.trips.delete(tripId);
  }

  addPlace(tripId: string, dto: AddTripPlaceDto): TripPlace | null {
    const trip = this.findById(tripId);

    if (!trip) {
      return null;
    }

    const place = {
      ...dto.place,
      id: dto.place.id ?? randomUUID(),
    };
    const tripPlace: TripPlace = {
      tripPlaceId: randomUUID(),
      position: trip.places.length + 1,
      dayNumber: dto.dayNumber ?? 1,
      notes: dto.notes,
      isLocked: trip.places.length === 0,
      place,
    };

    trip.places = [...trip.places, tripPlace];
    trip.latestRoute = null;
    trip.updatedAt = new Date().toISOString();
    return tripPlace;
  }

  replacePlaces(tripId: string, places: TripPlace[]): Trip | null {
    const trip = this.findById(tripId);

    if (!trip) {
      return null;
    }

    trip.places = places.map((place, index) => ({
      ...place,
      position: index + 1,
    }));
    trip.latestRoute = null;
    trip.updatedAt = new Date().toISOString();
    return trip;
  }

  saveRoute(tripId: string, route: OptimizedRoute): OptimizedRoute | null {
    const trip = this.findById(tripId);

    if (!trip) {
      return null;
    }

    trip.latestRoute = route;
    trip.places = route.orderedStops;
    trip.status = 'planned';
    trip.updatedAt = new Date().toISOString();
    return route;
  }
}
