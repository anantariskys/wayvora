export type TravelProfile = "driving" | "walking" | "cycling";

export type Place = {
  id: string;
  provider: "osm" | "maplibre";
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

export type OptimizedRoute = {
  routeId: string;
  tripId: string;
  algorithm: "nearest_neighbor";
  profile: TravelProfile;
  orderedStops: TripPlace[];
  summary: {
    totalDistanceMeters: number;
    totalDurationSeconds: number;
    matrixCacheHit: boolean;
    optimizationRuntimeMs: number;
    providerRuntimeMs: number;
  };
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
};

export type Trip = {
  id: string;
  name: string;
  description: string;
  status: "draft" | "planned";
  visibility: "private" | "shared";
  startDate: string;
  endDate: string;
  places: TripPlace[];
  latestRoute: OptimizedRoute | null;
};

export type OptimizeTripInput = {
  profile: TravelProfile;
  startTripPlaceId?: string;
  returnToStart: boolean;
  respectLockedPlaces: boolean;
};
