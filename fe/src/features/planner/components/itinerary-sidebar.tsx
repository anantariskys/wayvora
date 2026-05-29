"use client";

import {
  GripVertical,
  Lock,
  MapPin,
  Navigation,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlaceSearchResult } from "@/features/places/types";
import { formatDuration } from "@/lib/utils";
import { usePlannerStore } from "../stores/planner.store";
import type { OptimizedRoute, Place, TravelProfile, TripPlace } from "../types";
import { PlaceSearch } from "./place-search";
import { RouteSummary } from "./route-summary";

type ItinerarySidebarProps = {
  tripName: string;
  places: TripPlace[];
  route: OptimizedRoute | null;
  startPoint: Place | null;
  profile: TravelProfile;
  isOptimizing: boolean;
  isRouting?: boolean;
  canOptimize: boolean;
  onOptimize: () => void;
  onProfileChange: (profile: TravelProfile) => void;
  onPlaceSelect: (place: PlaceSearchResult) => void;
  onStartPointSelect: (place: PlaceSearchResult) => void;
  onUseCurrentLocationAsStart: () => void;
  onPlaceRemove: (tripPlaceId: string) => void;
  onAlternativeSelect: (index: number) => void;
  searchProximity?: { latitude: number; longitude: number } | null;
};

const profiles: TravelProfile[] = ["driving", "walking", "cycling"];

export function ItinerarySidebar({
  tripName,
  places,
  route,
  startPoint,
  profile,
  isOptimizing,
  isRouting,
  canOptimize,
  onOptimize,
  onProfileChange,
  onPlaceSelect,
  onStartPointSelect,
  onUseCurrentLocationAsStart,
  onPlaceRemove,
  onAlternativeSelect,
  searchProximity,
}: ItinerarySidebarProps) {
  return (
    <>
      <aside className="z-20 hidden h-full min-h-0 w-[392px] shrink-0 flex-col border-r border-slate-200 bg-white shadow-xl lg:flex">
        <SidebarContent
          tripName={tripName}
          places={places}
          route={route}
          startPoint={startPoint}
          profile={profile}
          isOptimizing={isOptimizing}
          isRouting={isRouting}
          canOptimize={canOptimize}
          onOptimize={onOptimize}
          onProfileChange={onProfileChange}
          onPlaceSelect={onPlaceSelect}
          onStartPointSelect={onStartPointSelect}
          onUseCurrentLocationAsStart={onUseCurrentLocationAsStart}
          onPlaceRemove={onPlaceRemove}
          onAlternativeSelect={onAlternativeSelect}
          searchProximity={searchProximity}
        />
      </aside>
      <div className="absolute inset-x-3 bottom-3 z-30 rounded-md border border-white/80 bg-white/95 p-3 shadow-2xl backdrop-blur-md lg:hidden">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" />
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-950">{tripName}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {places.length} places - {profile}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={!canOptimize || isOptimizing}
            onClick={onOptimize}
          >
            {isOptimizing ? "Calculating..." : "Optimize"}
          </Button>
        </div>
      </div>
    </>
  );
}

function SidebarContent({
  tripName,
  places,
  route,
  startPoint,
  profile,
  isOptimizing,
  isRouting,
  canOptimize,
  onOptimize,
  onProfileChange,
  onPlaceSelect,
  onStartPointSelect,
  onUseCurrentLocationAsStart,
  onPlaceRemove,
  onAlternativeSelect,
  searchProximity,
}: ItinerarySidebarProps) {
  return (
    <>
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
              <Sparkles size={13} aria-hidden="true" />
              Smart route planner
            </div>
            <h1 className="text-lg font-semibold text-slate-950">{tripName}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {places.length} places - route optimization workspace
            </p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            aria-label="Navigate to route"
          >
            <Navigation size={16} aria-hidden="true" />
          </Button>
        </div>

        <div className="mt-4">
          <PlaceSearch
            onPlaceSelect={onPlaceSelect}
            proximity={searchProximity}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-width:thin]">
        <section className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Start point
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {startPoint
                  ? `${startPoint.name} - ${startPoint.address}`
                  : "Choose your kos, hotel, or current location."}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={onUseCurrentLocationAsStart}
            >
              Current
            </Button>
          </div>
          <div className="mt-3">
            <PlaceSearch
              onPlaceSelect={onStartPointSelect}
              proximity={searchProximity}
              placeholder="Search start point"
            />
          </div>
        </section>

        <div className="mb-4 flex rounded-md border border-slate-200 bg-slate-50 p-1">
          {profiles.map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => onProfileChange(item)}
              className={`h-8 flex-1 rounded px-2 text-sm font-medium capitalize transition ${
                profile === item
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <RouteSummary route={route} profile={profile} isStale={isRouting} />

        {route?.alternatives && route.alternatives.length > 1 ? (
          <section className="mt-3 rounded-md border border-slate-200 bg-white p-3">
            <h2 className="text-sm font-semibold text-slate-950">
              Alternative roads
            </h2>
            <div className="mt-2 grid gap-2">
              {route.alternatives.map((alternative) => (
                <button
                  type="button"
                  key={alternative.index}
                  onClick={() => onAlternativeSelect(alternative.index)}
                  className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                    route.activeAlternativeIndex === alternative.index
                      ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
                  }`}
                >
                  {alternative.label} -{" "}
                  {Math.round(alternative.totalDurationSeconds / 60)} min
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-950">Itinerary</h2>
          <span className="text-xs text-slate-500">Drag-ready list</span>
        </div>

        <ul className="mt-3 space-y-2">
          {places.map((item) => (
            <ItineraryItem
              key={item.tripPlaceId}
              item={item}
              onRemove={onPlaceRemove}
            />
          ))}
        </ul>
      </div>

      <div className="border-t border-slate-200 bg-white p-4">
        <Button
          type="button"
          className="w-full"
          disabled={!canOptimize || isOptimizing}
          onClick={onOptimize}
        >
          {isOptimizing
            ? "Optimizing route..."
            : isRouting
              ? "Updating road route..."
              : "Optimize route"}
        </Button>
      </div>
    </>
  );
}

function ItineraryItem({
  item,
  onRemove,
}: {
  item: TripPlace;
  onRemove: (tripPlaceId: string) => void;
}) {
  const selectedPlaceId = usePlannerStore((state) => state.selectedPlaceId);
  const setSelectedPlaceId = usePlannerStore(
    (state) => state.setSelectedPlaceId,
  );
  const setHoveredPlaceId = usePlannerStore((state) => state.setHoveredPlaceId);
  const isSelected = selectedPlaceId === item.tripPlaceId;

  return (
    <li
      onMouseEnter={() => setHoveredPlaceId(item.tripPlaceId)}
      onMouseLeave={() => setHoveredPlaceId(null)}
      className={`w-full rounded-md border bg-white p-3 text-left shadow-sm transition ${
        isSelected
          ? "border-slate-900 ring-4 ring-slate-100"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setSelectedPlaceId(item.tripPlaceId)}
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-950 text-sm font-semibold text-white"
          aria-label={`Select ${item.place.name}`}
        >
          {item.position}
        </button>
        <button
          type="button"
          onClick={() => setSelectedPlaceId(item.tripPlaceId)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-slate-950">
              {item.place.name}
            </h3>
            {item.isLocked ? (
              <Lock
                className="shrink-0 text-slate-400"
                size={13}
                aria-label="Locked stop"
              />
            ) : null}
          </div>
          <p className="mt-1 truncate text-xs text-slate-500">
            {item.place.address}
          </p>
          {item.durationFromPreviousSeconds ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin size={13} aria-hidden="true" />
              {formatDuration(item.durationFromPreviousSeconds)} from previous
            </p>
          ) : null}
        </button>
        <span className="flex shrink-0 items-center gap-1 text-slate-400">
          <GripVertical size={16} aria-hidden="true" />
          <button
            type="button"
            onClick={() => onRemove(item.tripPlaceId)}
            className="rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
            aria-label={`Remove ${item.place.name}`}
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
        </span>
      </div>
    </li>
  );
}
