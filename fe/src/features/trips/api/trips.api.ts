import { demoRoute, demoTrip } from "@/features/planner/api/mock-data";
import type {
  OptimizedRoute,
  OptimizeTripInput,
  Trip,
} from "@/features/planner/types";
import { type ApiResponse, apiClient } from "@/lib/api/http-client";

const shouldUseMockApi = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const tripsApi = {
  async listTrips() {
    if (shouldUseMockApi) {
      await wait(250);
      return [
        {
          id: demoTrip.id,
          name: demoTrip.name,
          description: demoTrip.description,
          placeCount: demoTrip.places.length,
          lastOptimizedAt: "2026-05-27T11:04:30.000Z",
        },
      ];
    }

    const response =
      await apiClient.get<
        ApiResponse<
          Array<{
            id: string;
            name: string;
            description: string;
            placeCount: number;
            lastOptimizedAt?: string;
          }>
        >
      >("/trips");

    return response.data.data;
  },

  async getTrip(tripId: string): Promise<Trip> {
    if (tripId === "new") {
      await wait(150);
      return {
        id: "new",
        name: "Untitled Trip",
        description: "New route planning workspace.",
        status: "draft",
        visibility: "private",
        startDate: "",
        endDate: "",
        places: [],
        latestRoute: null,
      };
    }

    if (shouldUseMockApi || tripId === "demo") {
      await wait(250);
      return { ...demoTrip, id: tripId === "demo" ? "demo" : demoTrip.id };
    }

    const response = await apiClient.get<ApiResponse<Trip>>(`/trips/${tripId}`);
    return response.data.data;
  },

  async optimizeTrip(
    tripId: string,
    input: OptimizeTripInput,
  ): Promise<OptimizedRoute> {
    if (shouldUseMockApi || tripId === "demo") {
      await wait(900);
      return {
        ...demoRoute,
        tripId: tripId === "demo" ? "demo" : demoTrip.id,
        profile: input.profile,
      };
    }

    const response = await apiClient.post<ApiResponse<OptimizedRoute>>(
      `/trips/${tripId}/optimize`,
      input,
    );

    return response.data.data;
  },
};
