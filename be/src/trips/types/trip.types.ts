export type TravelProfile = 'driving' | 'walking' | 'cycling';

export type Place = {
  id: string;
  provider: 'mapbox' | 'osm' | 'maplibre';
  providerPlaceId: string;
  name: string;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  category: string;
};

export type TripPlace = {
  tripPlaceId: string;
  position: number;
  dayNumber: number;
  notes?: string;
  isLocked: boolean;
  place: Place;
  durationFromPreviousSeconds?: number;
};

export type RouteAlternative = {
  index: number;
  label: string;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
};

export type OptimizedRoute = {
  routeId: string;
  tripId: string;
  algorithm: 'nearest_neighbor';
  profile: TravelProfile;
  startPoint?: Place | null;
  orderedStops: TripPlace[];
  alternatives: RouteAlternative[];
  activeAlternativeIndex: number;
  summary: {
    totalDistanceMeters: number;
    totalDurationSeconds: number;
    matrixCacheHit: boolean;
    optimizationRuntimeMs: number;
    providerRuntimeMs: number;
  };
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
};

export type Trip = {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  status: 'draft' | 'planned';
  visibility: 'private' | 'shared';
  startDate?: string;
  endDate?: string;
  places: TripPlace[];
  latestRoute: OptimizedRoute | null;
  createdAt: string;
  updatedAt: string;
};
