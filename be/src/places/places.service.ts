import { BadRequestException, Injectable } from '@nestjs/common';
import { MapboxSearchClient } from '../mapbox/mapbox-search.client';
import type { Place } from '../trips/types/trip.types';
import type { SearchPlacesQuery } from './dto/search-places.dto';

const seedPlaces: Place[] = [
  {
    id: 'place_tokyo_station',
    provider: 'osm',
    providerPlaceId: 'osm.tokyo_station',
    name: 'Tokyo Station',
    address: '1 Chome Marunouchi, Chiyoda City, Tokyo',
    city: 'Tokyo',
    country: 'Japan',
    latitude: 35.6812,
    longitude: 139.7671,
    category: 'transit',
  },
  {
    id: 'place_sensoji',
    provider: 'osm',
    providerPlaceId: 'osm.sensoji',
    name: 'Senso-ji',
    address: '2 Chome-3-1 Asakusa, Taito City, Tokyo',
    city: 'Tokyo',
    country: 'Japan',
    latitude: 35.7148,
    longitude: 139.7967,
    category: 'temple',
  },
  {
    id: 'place_shibuya_crossing',
    provider: 'osm',
    providerPlaceId: 'osm.shibuya_crossing',
    name: 'Shibuya Crossing',
    address: 'Shibuya City, Tokyo',
    city: 'Tokyo',
    country: 'Japan',
    latitude: 35.6595,
    longitude: 139.7004,
    category: 'landmark',
  },
  {
    id: 'place_monas',
    provider: 'osm',
    providerPlaceId: 'osm.monas',
    name: 'Monumen Nasional',
    address: 'Gambir, Central Jakarta',
    city: 'Jakarta',
    country: 'Indonesia',
    latitude: -6.1754,
    longitude: 106.8272,
    category: 'landmark',
  },
  {
    id: 'place_kota_tua',
    provider: 'osm',
    providerPlaceId: 'osm.kota_tua',
    name: 'Kota Tua Jakarta',
    address: 'Pinangsia, West Jakarta',
    city: 'Jakarta',
    country: 'Indonesia',
    latitude: -6.1352,
    longitude: 106.8133,
    category: 'historic',
  },
  {
    id: 'place_bandung_station',
    provider: 'osm',
    providerPlaceId: 'osm.bandung_station',
    name: 'Bandung Station',
    address: 'Kebonjeruk, Bandung',
    city: 'Bandung',
    country: 'Indonesia',
    latitude: -6.9147,
    longitude: 107.6026,
    category: 'transit',
  },
];

@Injectable()
export class PlacesService {
  constructor(private readonly mapboxSearchClient: MapboxSearchClient) {}

  async search(query: SearchPlacesQuery): Promise<Place[]> {
    const search = query.q?.trim().toLowerCase();
    const limit = Number(query.limit ?? 5);

    if (!search || search.length < 2) {
      throw new BadRequestException(
        'Search query must be at least 2 characters.',
      );
    }

    if (!Number.isFinite(limit) || limit < 1 || limit > 10) {
      throw new BadRequestException('Search limit must be between 1 and 10.');
    }

    const proximity = parseProximity(query.proximity);
    const mapboxResults = await this.mapboxSearchClient.search({
      query: search,
      proximity,
      limit,
    });

    if (mapboxResults) {
      return mapboxResults;
    }

    return seedPlaces
      .filter((place) =>
        [place.name, place.address, place.city, place.country, place.category]
          .join(' ')
          .toLowerCase()
          .includes(search),
      )
      .sort((a, b) => {
        if (!proximity) {
          return a.name.localeCompare(b.name);
        }

        return (
          getDistanceMeters(proximity, a) - getDistanceMeters(proximity, b)
        );
      })
      .slice(0, limit);
  }
}

function parseProximity(
  value?: string,
): { latitude: number; longitude: number } | null {
  if (!value) {
    return null;
  }

  const [longitude, latitude] = value.split(',').map(Number);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new BadRequestException('Proximity must be longitude,latitude.');
  }

  return { latitude, longitude };
}

function getDistanceMeters(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
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
