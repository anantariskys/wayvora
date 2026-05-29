"use client";

import axios from "axios";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { PlaceSearchResult } from "@/features/places/types";
import { useTrip } from "@/features/trips/hooks/use-trips";
import type {
  OptimizedRoute,
  Place,
  RouteAlternative,
  TravelProfile,
  TripPlace,
} from "../types";
import { ItinerarySidebar } from "./itinerary-sidebar";

const PlannerMap = dynamic(() => import("./planner-map"), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-[420px] flex-1 place-items-center bg-slate-100 text-sm text-slate-500">
      Loading map workspace...
    </div>
  ),
});

type TripPlannerProps = {
  tripId: string;
};

export function TripPlanner({ tripId }: TripPlannerProps) {
  const [profile, setProfile] = useState<TravelProfile>("driving");
  const [draftPlaces, setDraftPlaces] = useState<TripPlace[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Place | null>(null);
  const [startPoint, setStartPoint] = useState<Place | null>(null);
  const [pendingMapPoint, setPendingMapPoint] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [pendingMapPointName, setPendingMapPointName] = useState("");
  const [pendingRemovePlace, setPendingRemovePlace] =
    useState<TripPlace | null>(null);
  const [localRoute, setLocalRoute] = useState<OptimizedRoute | null>(null);
  const [isRouting, setIsRouting] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const tripQuery = useTrip(tripId);

  const route = useMemo(
    () => localRoute ?? tripQuery.data?.latestRoute ?? null,
    [localRoute, tripQuery.data?.latestRoute],
  );

  useEffect(() => {
    if (!tripQuery.data) {
      return;
    }

    setDraftPlaces(tripQuery.data.places);
  }, [tripQuery.data]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setCurrentLocation(createCurrentLocationPlace(-6.1754, 106.8272, true));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation(
          createCurrentLocationPlace(
            position.coords.latitude,
            position.coords.longitude,
            false,
          ),
        );
      },
      () => {
        setCurrentLocation(createCurrentLocationPlace(-6.1754, 106.8272, true));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 8000,
      },
    );
  }, []);

  useEffect(() => {
    if (!currentLocation || startPoint) {
      return;
    }

    setStartPoint(currentLocation);
  }, [currentLocation, startPoint]);

  const places = route?.orderedStops ?? draftPlaces;
  const canOptimize =
    places.length >= 2 || Boolean(startPoint && places.length);

  useEffect(() => {
    let cancelled = false;

    async function refreshRoadPreview() {
      if (
        draftPlaces.length === 0 ||
        (!startPoint && draftPlaces.length < 2) ||
        localRoute
      ) {
        return;
      }

      setIsRouting(true);
      const previewRoute = await createRoadPreviewRoute(
        tripId,
        draftPlaces,
        profile,
        startPoint,
      );

      if (!cancelled) {
        setLocalRoute(previewRoute);
        setIsRouting(false);
      }
    }

    refreshRoadPreview();

    return () => {
      cancelled = true;
    };
  }, [draftPlaces, localRoute, profile, startPoint, tripId]);

  if (tripQuery.isLoading) {
    return (
      <main className="grid h-dvh place-items-center bg-slate-50">
        <div className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
          Loading trip planner...
        </div>
      </main>
    );
  }

  if (!tripQuery.data) {
    return (
      <main className="grid h-dvh place-items-center bg-slate-50">
        <div className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
          Trip was not found.
        </div>
      </main>
    );
  }

  function addPlace(place: Place) {
    setDraftPlaces((currentPlaces) => {
      const alreadyExists = currentPlaces.some(
        (item) => item.place.providerPlaceId === place.providerPlaceId,
      );

      if (alreadyExists) {
        return currentPlaces;
      }

      return [
        ...currentPlaces,
        {
          tripPlaceId: `tp_${place.providerPlaceId.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`,
          position: currentPlaces.length + 1,
          dayNumber: 1,
          isLocked: currentPlaces.length === 0,
          place,
        },
      ];
    });
    setLocalRoute(null);
  }

  function addSearchResult(result: PlaceSearchResult) {
    addPlace(result);
  }

  function updateStartPoint(place: Place) {
    setStartPoint(place);
    setLocalRoute(null);
  }

  function addMapPoint(coordinates: { latitude: number; longitude: number }) {
    setPendingMapPoint(coordinates);
    setPendingMapPointName(`Pinned location ${places.length + 1}`);
  }

  function confirmMapPoint() {
    if (!pendingMapPoint) {
      return;
    }

    addPlace({
      id: `map_point_${pendingMapPoint.latitude}_${pendingMapPoint.longitude}`,
      provider: "maplibre",
      providerPlaceId: `map:${pendingMapPoint.latitude.toFixed(6)},${pendingMapPoint.longitude.toFixed(6)}`,
      name:
        pendingMapPointName.trim() || `Pinned location ${places.length + 1}`,
      address: `${pendingMapPoint.latitude.toFixed(5)}, ${pendingMapPoint.longitude.toFixed(5)}`,
      city: "",
      country: "",
      latitude: pendingMapPoint.latitude,
      longitude: pendingMapPoint.longitude,
      category: "map point",
    });
    setPendingMapPoint(null);
    setPendingMapPointName("");
  }

  function removePlace(tripPlaceId: string) {
    setDraftPlaces((currentPlaces) =>
      currentPlaces
        .filter((item) => item.tripPlaceId !== tripPlaceId)
        .map((item, index) => ({
          ...item,
          position: index + 1,
          isLocked: index === 0 ? item.isLocked : false,
        })),
    );
    setLocalRoute(null);
  }

  function confirmRemovePlace() {
    if (!pendingRemovePlace) {
      return;
    }

    removePlace(pendingRemovePlace.tripPlaceId);
    setPendingRemovePlace(null);
  }

  async function optimizeCurrentRoute() {
    if (!canOptimize) {
      return;
    }

    setIsOptimizing(true);

    window.setTimeout(async () => {
      setLocalRoute(
        await createLocalOptimizedRoute(tripId, places, profile, startPoint),
      );
      setIsOptimizing(false);
    }, 450);
  }

  function selectAlternative(index: number) {
    const currentRoute = route;
    const alternative = currentRoute?.alternatives?.find(
      (item) => item.index === index,
    );

    if (!currentRoute || !alternative) {
      return;
    }

    setLocalRoute((localCurrentRoute) => {
      const routeToUpdate = localCurrentRoute ?? currentRoute;
      const selectedAlternative = routeToUpdate.alternatives?.find(
        (item) => item.index === index,
      );

      if (!selectedAlternative) {
        return routeToUpdate;
      }

      return applyAlternative(routeToUpdate, selectedAlternative);
    });
  }

  return (
    <main className="relative flex h-dvh overflow-hidden bg-slate-50">
      <ItinerarySidebar
        tripName={tripQuery.data.name}
        places={places}
        route={route}
        startPoint={startPoint}
        profile={profile}
        isOptimizing={isOptimizing}
        isRouting={isRouting}
        canOptimize={canOptimize}
        onProfileChange={setProfile}
        onPlaceSelect={addSearchResult}
        onStartPointSelect={updateStartPoint}
        onUseCurrentLocationAsStart={() => {
          if (currentLocation) {
            updateStartPoint(currentLocation);
          }
        }}
        onPlaceRemove={(tripPlaceId) => {
          const place = places.find((item) => item.tripPlaceId === tripPlaceId);

          if (place) {
            setPendingRemovePlace(place);
          }
        }}
        onAlternativeSelect={selectAlternative}
        searchProximity={
          currentLocation
            ? {
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
              }
            : null
        }
        onOptimize={optimizeCurrentRoute}
      />
      <PlannerMap
        places={places}
        route={route}
        currentLocation={currentLocation}
        startPoint={startPoint}
        onMapPointAdd={addMapPoint}
      />
      <Modal
        open={Boolean(pendingMapPoint)}
        title="Add pinned location"
        description="Name this map point before adding it to the itinerary."
        confirmLabel="Add location"
        onConfirm={confirmMapPoint}
        onClose={() => {
          setPendingMapPoint(null);
          setPendingMapPointName("");
        }}
      >
        <Input
          label="Location name"
          value={pendingMapPointName}
          onChange={(event) => setPendingMapPointName(event.target.value)}
          placeholder="Example: Coffee stop near hotel"
          autoFocus
        />
        {pendingMapPoint ? (
          <p className="mt-3 text-xs text-slate-500">
            Coordinates: {pendingMapPoint.latitude.toFixed(5)},{" "}
            {pendingMapPoint.longitude.toFixed(5)}
          </p>
        ) : null}
      </Modal>
      <Modal
        open={Boolean(pendingRemovePlace)}
        title="Remove destination"
        description="This destination will be removed from the current itinerary."
        confirmLabel="Remove"
        cancelLabel="Keep"
        confirmVariant="danger"
        onConfirm={confirmRemovePlace}
        onClose={() => setPendingRemovePlace(null)}
      >
        <div className="rounded-md border border-red-100 bg-red-50 p-3">
          <p className="text-sm font-semibold text-red-950">
            {pendingRemovePlace?.place.name}
          </p>
          <p className="mt-1 text-sm leading-6 text-red-700">
            {pendingRemovePlace?.place.address}
          </p>
        </div>
      </Modal>
    </main>
  );
}

async function createRoadPreviewRoute(
  tripId: string,
  places: TripPlace[],
  profile: TravelProfile,
  startPoint: Place | null,
): Promise<OptimizedRoute> {
  const orderedStops = places.map((item, index) => ({
    ...item,
    position: index + 1,
    durationFromPreviousSeconds:
      index === 0 && !startPoint
        ? undefined
        : estimateDurationSeconds(
            index === 0 && startPoint ? startPoint : places[index - 1].place,
            item.place,
            profile,
          ),
  }));
  const straightLineDistanceMeters = getRouteDistanceMeters(
    orderedStops,
    startPoint,
  );
  const roadRoute = await getRoadRoute(orderedStops, profile, startPoint);
  const fallbackCoordinates = getFallbackRouteCoordinates(
    orderedStops,
    startPoint,
  );
  const alternatives = buildRouteAlternatives(
    roadRoute?.alternatives,
    fallbackCoordinates,
    straightLineDistanceMeters,
    orderedStops.reduce(
      (total, item) => total + (item.durationFromPreviousSeconds ?? 0),
      0,
    ),
  );
  const activeAlternative = alternatives[0];

  return {
    routeId: `preview_route_${Date.now()}`,
    tripId,
    algorithm: "nearest_neighbor",
    profile,
    startPoint,
    orderedStops,
    alternatives,
    activeAlternativeIndex: activeAlternative?.index ?? 0,
    summary: {
      totalDistanceMeters: Math.round(
        activeAlternative?.totalDistanceMeters ??
          roadRoute?.distanceMeters ??
          straightLineDistanceMeters,
      ),
      totalDurationSeconds:
        activeAlternative?.totalDurationSeconds ??
        roadRoute?.durationSeconds ??
        orderedStops.reduce(
          (total, item) => total + (item.durationFromPreviousSeconds ?? 0),
          0,
        ),
      matrixCacheHit: false,
      optimizationRuntimeMs: 0,
      providerRuntimeMs: roadRoute?.providerRuntimeMs ?? 0,
    },
    geometry: {
      type: "LineString",
      coordinates:
        activeAlternative?.geometry.coordinates ??
        roadRoute?.coordinates ??
        fallbackCoordinates,
    },
  };
}

async function createLocalOptimizedRoute(
  tripId: string,
  places: TripPlace[],
  profile: TravelProfile,
  startPoint: Place | null,
): Promise<OptimizedRoute> {
  const nearestStops = nearestNeighbor(places, profile, startPoint);
  const orderedStops = nearestStops.map((item, index) => ({
    ...item,
    position: index + 1,
    durationFromPreviousSeconds:
      index === 0 && !startPoint
        ? undefined
        : estimateDurationSeconds(
            index === 0 && startPoint
              ? startPoint
              : nearestStops[index - 1].place,
            item.place,
            profile,
          ),
  }));
  const straightLineDistanceMeters = getRouteDistanceMeters(
    orderedStops,
    startPoint,
  );
  const roadRoute = await getRoadRoute(orderedStops, profile, startPoint);
  const fallbackCoordinates = getFallbackRouteCoordinates(
    orderedStops,
    startPoint,
  );
  const alternatives = buildRouteAlternatives(
    roadRoute?.alternatives,
    fallbackCoordinates,
    straightLineDistanceMeters,
    orderedStops.reduce(
      (total, item) => total + (item.durationFromPreviousSeconds ?? 0),
      0,
    ),
  );
  const activeAlternative = alternatives[0];

  return {
    routeId: `local_route_${Date.now()}`,
    tripId,
    algorithm: "nearest_neighbor",
    profile,
    startPoint,
    orderedStops,
    alternatives,
    activeAlternativeIndex: activeAlternative?.index ?? 0,
    summary: {
      totalDistanceMeters: Math.round(
        activeAlternative?.totalDistanceMeters ??
          roadRoute?.distanceMeters ??
          straightLineDistanceMeters,
      ),
      totalDurationSeconds:
        activeAlternative?.totalDurationSeconds ??
        roadRoute?.durationSeconds ??
        orderedStops.reduce(
          (total, item) => total + (item.durationFromPreviousSeconds ?? 0),
          0,
        ),
      matrixCacheHit: false,
      optimizationRuntimeMs: 2,
      providerRuntimeMs: roadRoute?.providerRuntimeMs ?? 0,
    },
    geometry: {
      type: "LineString",
      coordinates:
        activeAlternative?.geometry.coordinates ??
        roadRoute?.coordinates ??
        fallbackCoordinates,
    },
  };
}

async function getRoadRoute(
  places: TripPlace[],
  profile: TravelProfile,
  startPoint: Place | null,
) {
  const routePlaces = startPoint
    ? [startPoint, ...places.map((item) => item.place)]
    : places.map((item) => item.place);
  const coordinates = routePlaces
    .map((place) => `${place.longitude},${place.latitude}`)
    .join(";");
  const osrmProfile = {
    driving: "driving",
    cycling: "bike",
    walking: "foot",
  } satisfies Record<TravelProfile, string>;
  const url = `https://router.project-osrm.org/route/v1/${osrmProfile[profile]}/${coordinates}`;
  const startedAt = performance.now();

  try {
    const response = await axios.get<{
      routes?: Array<{
        distance: number;
        duration: number;
        geometry: {
          coordinates: [number, number][];
        };
      }>;
    }>(url, {
      params: {
        overview: "full",
        geometries: "geojson",
        steps: false,
        alternatives: true,
      },
    });
    const route = response.data.routes?.[0];

    if (!route) {
      return null;
    }

    return {
      coordinates: route.geometry.coordinates,
      distanceMeters: route.distance,
      durationSeconds: Math.round(route.duration),
      providerRuntimeMs: Math.round(performance.now() - startedAt),
      alternatives: response.data.routes?.map((item, index) => ({
        index,
        distance: item.distance,
        duration: item.duration,
        coordinates: item.geometry.coordinates,
      })),
    };
  } catch {
    return null;
  }
}

function nearestNeighbor(
  places: TripPlace[],
  profile: TravelProfile,
  startPoint: Place | null,
) {
  const unvisited = [...places];
  const orderedStops: TripPlace[] = [];
  let currentPlace = startPoint ?? unvisited.shift()?.place;

  if (!currentPlace) {
    return orderedStops;
  }

  if (!startPoint && places[0]) {
    orderedStops.push(places[0]);
  }

  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < unvisited.length; index += 1) {
      const distance = getModeCost(
        currentPlace,
        unvisited[index].place,
        profile,
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    }

    const [nearest] = unvisited.splice(nearestIndex, 1);
    orderedStops.push(nearest);
    currentPlace = nearest.place;
  }

  return orderedStops;
}

function buildRouteAlternatives(
  alternatives:
    | Array<{
        index: number;
        distance: number;
        duration: number;
        coordinates: [number, number][];
      }>
    | undefined,
  fallbackCoordinates: [number, number][],
  fallbackDistanceMeters: number,
  fallbackDurationSeconds: number,
): RouteAlternative[] {
  const roadAlternatives: RouteAlternative[] = (alternatives ?? [])
    .slice(0, 3)
    .map((item, index) => ({
      index,
      label: index === 0 ? "Recommended" : `Alternative ${index + 1}`,
      totalDistanceMeters: item.distance,
      totalDurationSeconds: Math.round(item.duration),
      geometry: {
        type: "LineString",
        coordinates: item.coordinates,
      },
    }));

  if (roadAlternatives.length > 0) {
    return roadAlternatives;
  }

  if (fallbackCoordinates.length < 2) {
    return [];
  }

  return [
    {
      index: 0,
      label: "Recommended",
      totalDistanceMeters: fallbackDistanceMeters,
      totalDurationSeconds: fallbackDurationSeconds,
      geometry: {
        type: "LineString",
        coordinates: fallbackCoordinates,
      },
    },
  ];
}

function applyAlternative(
  route: OptimizedRoute,
  alternative: RouteAlternative,
): OptimizedRoute {
  return {
    ...route,
    activeAlternativeIndex: alternative.index,
    summary: {
      ...route.summary,
      totalDistanceMeters: Math.round(alternative.totalDistanceMeters),
      totalDurationSeconds: alternative.totalDurationSeconds,
    },
    geometry: alternative.geometry,
  };
}

function estimateDurationSeconds(
  origin: Place,
  destination: Place,
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

function getModeCost(
  origin: Place,
  destination: Place,
  profile: TravelProfile,
) {
  const distanceMeters = getDistanceMeters(origin, destination);
  const latitudeDelta = Math.abs(origin.latitude - destination.latitude);
  const longitudeDelta = Math.abs(origin.longitude - destination.longitude);
  const crossAxisPenalty = latitudeDelta > longitudeDelta ? 1 : 0;

  if (profile === "walking") {
    return distanceMeters * 0.92 + crossAxisPenalty * 35;
  }

  if (profile === "cycling") {
    return distanceMeters * 1.05 + crossAxisPenalty * 120;
  }

  return distanceMeters * 1.3 + (latitudeDelta + longitudeDelta) * 18_000;
}

function getRouteDistanceMeters(stops: TripPlace[], startPoint: Place | null) {
  const routePlaces = [
    ...(startPoint ? [startPoint] : []),
    ...stops.map((item) => item.place),
  ];

  return routePlaces.reduce((total, item, index) => {
    if (index === 0) {
      return total;
    }

    return total + getDistanceMeters(routePlaces[index - 1], item);
  }, 0);
}

function getFallbackRouteCoordinates(
  stops: TripPlace[],
  startPoint: Place | null,
): [number, number][] {
  return [
    ...(startPoint
      ? [[startPoint.longitude, startPoint.latitude] as [number, number]]
      : []),
    ...stops.map(
      (item) => [item.place.longitude, item.place.latitude] as [number, number],
    ),
  ];
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

function createCurrentLocationPlace(
  latitude: number,
  longitude: number,
  isFallback: boolean,
): Place {
  return {
    id: isFallback ? "fallback_current_location" : "current_location",
    provider: "maplibre",
    providerPlaceId: isFallback
      ? "current:fallback-jakarta"
      : `current:${latitude},${longitude}`,
    name: isFallback ? "Jakarta default location" : "Your current location",
    address: isFallback
      ? "Browser location unavailable. Showing Jakarta as default."
      : "Detected from your browser.",
    city: isFallback ? "Jakarta" : "",
    country: isFallback ? "Indonesia" : "",
    latitude,
    longitude,
    category: "current location",
  };
}
