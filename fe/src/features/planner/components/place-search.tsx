"use client";

import { Loader2, MapPin, Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { usePlaceSearch } from "@/features/places/hooks/use-place-search";
import type { PlaceSearchResult } from "@/features/places/types";

type PlaceSearchProps = {
  onPlaceSelect: (place: PlaceSearchResult) => void;
  proximity?: { latitude: number; longitude: number } | null;
  placeholder?: string;
};

export function PlaceSearch({
  onPlaceSelect,
  proximity,
  placeholder,
}: PlaceSearchProps) {
  const [query, setQuery] = useState("");
  const searchQuery = usePlaceSearch(query, proximity);
  const results = searchQuery.data ?? [];
  const shouldShowPanel =
    query.trim().length >= 2 ||
    searchQuery.isFetching ||
    searchQuery.isError ||
    results.length > 0;

  return (
    <div>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          size={16}
          aria-hidden="true"
        />
        <Input
          aria-label="Search destinations"
          className="pl-9"
          placeholder={
            placeholder ??
            (proximity ? "Search nearby destinations" : "Search destinations")
          }
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {searchQuery.isFetching ? (
          <Loader2
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
            size={16}
            aria-hidden="true"
          />
        ) : null}
      </div>
      {proximity ? (
        <p className="mt-1.5 text-xs text-slate-500">
          Prioritizing results near your current map location.
        </p>
      ) : null}

      {shouldShowPanel ? (
        <div className="mt-2 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          {results.map((item) => (
            <button
              type="button"
              key={`${item.provider}:${item.providerPlaceId}:${item.latitude}:${item.longitude}`}
              onClick={() => {
                onPlaceSelect(item);
                setQuery("");
              }}
              className="flex w-full gap-3 border-b border-slate-100 px-3 py-2.5 text-left last:border-b-0 hover:bg-slate-50"
            >
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                <MapPin size={15} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-900">
                  {item.name}
                </span>
                <span className="mt-0.5 block truncate text-xs text-slate-500">
                  {item.address}
                </span>
                <span className="mt-1 block text-xs capitalize text-slate-400">
                  {item.category}
                  {item.city ? ` - ${item.city}` : ""}
                  {item.country ? `, ${item.country}` : ""}
                </span>
              </span>
            </button>
          ))}

          {!searchQuery.isFetching &&
          !searchQuery.isError &&
          query.trim().length >= 2 &&
          results.length === 0 ? (
            <div className="px-3 py-3 text-sm text-slate-500">
              No real-world places found.
            </div>
          ) : null}

          {searchQuery.isError ? (
            <div className="px-3 py-3 text-sm text-red-600">
              Place search is unavailable. Try again in a moment.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
