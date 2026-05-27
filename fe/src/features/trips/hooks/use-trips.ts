"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OptimizeTripInput } from "@/features/planner/types";
import { tripsApi } from "../api/trips.api";

export const tripKeys = {
  all: ["trips"] as const,
  lists: () => [...tripKeys.all, "list"] as const,
  detail: (tripId: string) => [...tripKeys.all, "detail", tripId] as const,
  route: (tripId: string) => [...tripKeys.detail(tripId), "route"] as const,
};

export function useTrips() {
  return useQuery({
    queryKey: tripKeys.lists(),
    queryFn: () => tripsApi.listTrips(),
  });
}

export function useTrip(tripId: string) {
  return useQuery({
    queryKey: tripKeys.detail(tripId),
    queryFn: () => tripsApi.getTrip(tripId),
  });
}

export function useOptimizeTrip(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: OptimizeTripInput) =>
      tripsApi.optimizeTrip(tripId, payload),
    onSuccess: (route) => {
      queryClient.setQueryData(tripKeys.route(tripId), route);
      queryClient.setQueryData(tripKeys.detail(tripId), (current) => {
        if (!current || typeof current !== "object") {
          return current;
        }

        return {
          ...current,
          latestRoute: route,
          places: route.orderedStops,
        };
      });
    },
  });
}
