"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { placesApi } from "../api/places.api";

export function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [value, delayMs]);

  return debouncedValue;
}

export function usePlaceSearch(
  query: string,
  proximity?: { latitude: number; longitude: number } | null,
) {
  const debouncedQuery = useDebouncedValue(query.trim(), 450);
  const proximityKey = proximity
    ? `${proximity.latitude.toFixed(4)},${proximity.longitude.toFixed(4)}`
    : "global";

  return useQuery({
    queryKey: ["places", "search", debouncedQuery, proximityKey],
    queryFn: () =>
      placesApi.searchPlaces(debouncedQuery, proximity ?? undefined),
    enabled: debouncedQuery.length >= 2,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
