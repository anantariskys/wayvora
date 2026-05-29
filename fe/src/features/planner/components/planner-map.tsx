"use client";

import {
  Layers,
  LocateFixed,
  MapPin,
  Maximize2,
  MousePointer2,
  Route,
} from "lucide-react";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { getBounds, getRouteCoordinates } from "@/lib/map/geometry";
import { usePlannerStore } from "../stores/planner.store";
import type { OptimizedRoute, Place, TripPlace } from "../types";

type PlannerMapProps = {
  places: TripPlace[];
  route: OptimizedRoute | null;
  currentLocation: Place | null;
  startPoint: Place | null;
  onMapPointAdd: (coordinates: { latitude: number; longitude: number }) => void;
};

const freeMapStyleUrl = "https://tiles.openfreemap.org/styles/liberty";

export default function PlannerMap({
  places,
  route,
  currentLocation,
  startPoint,
  onMapPointAdd,
}: PlannerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRefs = useRef<Array<{ remove: () => void }>>([]);
  const currentLocationMarkerRef = useRef<{ remove: () => void } | null>(null);
  const startPointMarkerRef = useRef<{ remove: () => void } | null>(null);
  const onMapPointAddRef = useRef(onMapPointAdd);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [showStaticOverlay, setShowStaticOverlay] = useState(false);

  const selectedPlaceId = usePlannerStore((state) => state.selectedPlaceId);
  const setSelectedPlaceId = usePlannerStore(
    (state) => state.setSelectedPlaceId,
  );
  const routeCoordinates = useMemo(
    () => route?.geometry.coordinates ?? getRouteCoordinates(places),
    [places, route],
  );
  const centerCoordinate = useMemo<[number, number]>(() => {
    if (routeCoordinates.length > 0) {
      const bounds = getBounds(routeCoordinates);

      return [
        (bounds.minLng + bounds.maxLng) / 2,
        (bounds.minLat + bounds.maxLat) / 2,
      ];
    }

    if (currentLocation) {
      return [currentLocation.longitude, currentLocation.latitude];
    }

    return [106.8272, -6.1754];
  }, [currentLocation, routeCoordinates]);

  useEffect(() => {
    onMapPointAddRef.current = onMapPointAdd;
  }, [onMapPointAdd]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    let cancelled = false;

    async function loadMapLibre() {
      try {
        const maplibregl = await import("maplibre-gl");

        if (cancelled || !mapContainerRef.current) {
          return;
        }

        const map = new maplibregl.default.Map({
          container: mapContainerRef.current,
          style: freeMapStyleUrl,
          center: [106.8272, -6.1754],
          zoom: 12,
        });

        map.addControl(new maplibregl.default.NavigationControl(), "top-right");

        map.on("load", () => {
          setIsMapReady(true);
          map.addSource("wayvora-route", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: [],
              },
            },
          });

          map.addLayer({
            id: "wayvora-route-line",
            type: "line",
            source: "wayvora-route",
            layout: {
              "line-cap": "round",
              "line-join": "round",
            },
            paint: {
              "line-color": "#059669",
              "line-width": 5,
              "line-opacity": 0.9,
            },
          });
        });
        map.on("click", (event) => {
          onMapPointAddRef.current({
            latitude: event.lngLat.lat,
            longitude: event.lngLat.lng,
          });
        });

        map.on("error", () => {
          setShowStaticOverlay(true);
        });

        mapRef.current = map;
      } catch {
        setMapFailed(true);
      }
    }

    loadMapLibre();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isMapReady) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const map = mapRef.current;

      if (map && !map.areTilesLoaded()) {
        setShowStaticOverlay(true);
      }
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [isMapReady]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !map.isStyleLoaded()) {
      return;
    }

    const source = map.getSource("wayvora-route") as GeoJSONSource | undefined;

    source?.setData({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: routeCoordinates,
      },
    });

    if (routeCoordinates.length > 1) {
      const bounds = getBounds(routeCoordinates);
      map.fitBounds(
        [
          [bounds.minLng, bounds.minLat],
          [bounds.maxLng, bounds.maxLat],
        ],
        { padding: 80, maxZoom: 13 },
      );
    } else {
      map.easeTo({ center: centerCoordinate, zoom: 13 });
    }
  }, [centerCoordinate, routeCoordinates]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !isMapReady) {
      return;
    }

    const activeMap = map;
    let cancelled = false;

    async function syncMarkers() {
      const maplibregl = await import("maplibre-gl");

      if (cancelled || !mapRef.current) {
        return;
      }

      for (const marker of markerRefs.current) {
        marker.remove();
      }

      markerRefs.current = places.map((item) => {
        const marker = document.createElement("button");
        marker.type = "button";
        marker.textContent = String(item.position);
        marker.setAttribute("aria-label", `Select ${item.place.name}`);
        Object.assign(marker.style, {
          alignItems: "center",
          background: "linear-gradient(135deg, #020617 0%, #0f766e 100%)",
          border: "2px solid #ffffff",
          borderRadius: "999px",
          boxShadow: "0 14px 30px rgba(15, 23, 42, 0.28)",
          color: "#ffffff",
          cursor: "pointer",
          display: "flex",
          fontSize: "12px",
          fontWeight: "700",
          height: "34px",
          justifyContent: "center",
          width: "34px",
        });
        marker.addEventListener("click", (event) => {
          event.stopPropagation();
          setSelectedPlaceId(item.tripPlaceId);
        });

        return new maplibregl.default.Marker({ element: marker })
          .setLngLat([item.place.longitude, item.place.latitude])
          .addTo(activeMap);
      });
    }

    syncMarkers();

    return () => {
      cancelled = true;
    };
  }, [isMapReady, places, setSelectedPlaceId]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !isMapReady) {
      return;
    }

    const activeMap = map;
    let cancelled = false;

    async function syncCurrentLocationMarker() {
      const maplibregl = await import("maplibre-gl");

      if (cancelled || !mapRef.current) {
        return;
      }

      currentLocationMarkerRef.current?.remove();
      currentLocationMarkerRef.current = null;

      if (!currentLocation) {
        return;
      }

      const currentMarker = document.createElement("div");
      currentMarker.setAttribute("aria-label", currentLocation.name);
      Object.assign(currentMarker.style, {
        background: "#2563eb",
        border: "3px solid #ffffff",
        borderRadius: "999px",
        boxShadow: "0 0 0 8px rgba(37, 99, 235, 0.18)",
        height: "18px",
        width: "18px",
      });

      currentLocationMarkerRef.current = new maplibregl.default.Marker({
        element: currentMarker,
      })
        .setLngLat([currentLocation.longitude, currentLocation.latitude])
        .addTo(activeMap);
    }

    syncCurrentLocationMarker();

    return () => {
      cancelled = true;
    };
  }, [currentLocation, isMapReady]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !isMapReady) {
      return;
    }

    const activeMap = map;
    let cancelled = false;

    async function syncStartPointMarker() {
      const maplibregl = await import("maplibre-gl");

      if (cancelled || !mapRef.current) {
        return;
      }

      startPointMarkerRef.current?.remove();
      startPointMarkerRef.current = null;

      if (!startPoint) {
        return;
      }

      const startMarker = document.createElement("div");
      startMarker.textContent = "START";
      startMarker.setAttribute("aria-label", `Start from ${startPoint.name}`);
      Object.assign(startMarker.style, {
        alignItems: "center",
        background: "#f97316",
        border: "2px solid #ffffff",
        borderRadius: "6px",
        boxShadow: "0 12px 26px rgba(124, 45, 18, 0.28)",
        color: "#ffffff",
        display: "flex",
        fontSize: "11px",
        fontWeight: "800",
        height: "28px",
        justifyContent: "center",
        width: "34px",
      });

      startPointMarkerRef.current = new maplibregl.default.Marker({
        element: startMarker,
      })
        .setLngLat([startPoint.longitude, startPoint.latitude])
        .addTo(activeMap);
    }

    syncStartPointMarker();

    return () => {
      cancelled = true;
    };
  }, [isMapReady, startPoint]);

  if (mapFailed) {
    return (
      <FallbackMap
        places={places}
        currentLocation={currentLocation}
        startPoint={startPoint}
        route={route}
        selectedPlaceId={selectedPlaceId}
        onSelect={setSelectedPlaceId}
      />
    );
  }

  return (
    <section className="relative h-full min-h-0 flex-1 overflow-hidden bg-slate-100">
      <div className="absolute inset-0">
        <div ref={mapContainerRef} className="h-full w-full" />
      </div>
      <MapChrome places={places} />
      {!isMapReady ? (
        <div className="absolute inset-0 grid place-items-center bg-slate-100 text-sm text-slate-500">
          Loading MapLibre map...
        </div>
      ) : null}
      {showStaticOverlay ? (
        <StaticRouteOverlay
          places={places}
          currentLocation={currentLocation}
          startPoint={startPoint}
          selectedPlaceId={selectedPlaceId}
          onSelect={setSelectedPlaceId}
          showNotice
        />
      ) : null}
      <MapOverlay route={route} places={places} />
    </section>
  );
}

function FallbackMap({
  places,
  currentLocation,
  startPoint,
  route,
  selectedPlaceId,
  onSelect,
}: {
  places: TripPlace[];
  currentLocation: Place | null;
  startPoint: Place | null;
  route: OptimizedRoute | null;
  selectedPlaceId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <section className="relative h-full min-h-0 flex-1 overflow-hidden bg-[#dce8e4]">
      <StaticRouteOverlay
        places={places}
        currentLocation={currentLocation}
        startPoint={startPoint}
        selectedPlaceId={selectedPlaceId}
        onSelect={onSelect}
        showNotice
      />
      <MapOverlay route={route} places={places} />
    </section>
  );
}

function StaticRouteOverlay({
  places,
  currentLocation,
  startPoint,
  selectedPlaceId,
  onSelect,
  showNotice,
}: {
  places: TripPlace[];
  currentLocation: Place | null;
  startPoint: Place | null;
  selectedPlaceId: string | null;
  onSelect: (id: string | null) => void;
  showNotice?: boolean;
}) {
  return (
    <div className="absolute inset-0 z-10 overflow-hidden bg-[#dce8e4]/95">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(rgba(15,23,42,0.08)_1px,transparent_1px)] bg-[size:52px_52px]" />
      {places.length > 1 ? (
        <svg
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label="Fallback route map"
        >
          <title>Fallback route map</title>
          <polyline
            points="18,72 36,35 55,30 68,66 84,74"
            fill="none"
            stroke="#059669"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.4"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ) : null}

      <div className="absolute inset-0">
        {places.length === 0 && currentLocation ? (
          <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
            <span className="h-5 w-5 rounded-full border-[3px] border-white bg-blue-600 shadow-[0_0_0_10px_rgba(37,99,235,0.18)]" />
            <span className="rounded-md border border-white/80 bg-white/90 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
              {currentLocation.name}
            </span>
          </div>
        ) : null}

        {startPoint ? (
          <div className="absolute left-[18%] top-[72%] flex -translate-x-1/2 -translate-y-[calc(100%+14px)] flex-col items-center gap-1">
            <span className="rounded-md border-2 border-white bg-orange-500 px-2 py-1 text-[10px] font-extrabold text-white shadow-lg">
              START
            </span>
            <span className="max-w-32 truncate rounded-md border border-white/80 bg-white/90 px-2 py-1 text-xs font-medium text-slate-700 shadow-sm">
              {startPoint.name}
            </span>
          </div>
        ) : null}

        {places.map((item, index) => {
          const positions = [
            ["18%", "72%"],
            ["36%", "35%"],
            ["55%", "30%"],
            ["68%", "66%"],
            ["84%", "74%"],
          ];
          const [left, top] = positions[index] ?? ["50%", "50%"];
          const selected = selectedPlaceId === item.tripPlaceId;

          return (
            <button
              key={item.tripPlaceId}
              type="button"
              onClick={() => onSelect(item.tripPlaceId)}
              className={`absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md border-2 border-white text-sm font-semibold text-white shadow-lg transition ${
                selected
                  ? "scale-110 bg-emerald-600"
                  : "bg-slate-950 hover:bg-slate-800"
              }`}
              style={{ left, top }}
              aria-label={`Select ${item.place.name}`}
            >
              {item.position}
            </button>
          );
        })}
      </div>

      {showNotice ? (
        <div className="absolute left-4 top-4 max-w-sm rounded-md border border-white/80 bg-white/90 p-3 shadow-sm backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <MapPin size={16} aria-hidden="true" />
            MapLibre fallback preview
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Live maps use MapLibre GL JS with free map tiles. This preview keeps
            the planner usable if the tile service is blocked or slow.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function MapOverlay({
  route,
  places,
}: {
  route: OptimizedRoute | null;
  places: TripPlace[];
}) {
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-20 flex flex-wrap items-end justify-between gap-3">
      <div className="rounded-md border border-white/80 bg-white/90 px-3 py-2 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
          <Route size={16} aria-hidden="true" />
          {route ? "Optimized route active" : "Draft route preview"}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {places.length} stops - click map to add a point
        </p>
      </div>
      <Badge className="bg-white/90 shadow-lg backdrop-blur-md">
        <MousePointer2 size={13} aria-hidden="true" />
        Search or click directly on map
      </Badge>
    </div>
  );
}

function MapChrome({ places }: { places: TripPlace[] }) {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-slate-950/10 to-transparent" />
      <div className="absolute right-4 top-4 z-20 flex flex-col gap-2">
        <MapToolButton label="Map layers">
          <Layers size={16} aria-hidden="true" />
        </MapToolButton>
        <MapToolButton label="Locate route">
          <LocateFixed size={16} aria-hidden="true" />
        </MapToolButton>
        <MapToolButton label="Fullscreen map">
          <Maximize2 size={16} aria-hidden="true" />
        </MapToolButton>
      </div>
      <div className="absolute left-4 top-4 z-20 rounded-md border border-white/80 bg-white/90 px-3 py-2 shadow-lg backdrop-blur-md">
        <p className="text-xs font-medium uppercase text-emerald-700">
          {places.length === 0
            ? "Start from current location"
            : "Live route workspace"}
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-950">
          {places.length === 0
            ? "Search or click the map"
            : `${places.length} selected stops`}
        </p>
      </div>
    </>
  );
}

function MapToolButton({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-md border border-white/80 bg-white/90 text-slate-700 shadow-lg backdrop-blur-md transition hover:bg-white hover:text-slate-950"
    >
      {children}
    </button>
  );
}
