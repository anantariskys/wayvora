"use client";

import { create } from "zustand";

type SidebarMode = "places" | "route" | "details";

type PlannerState = {
  selectedPlaceId: string | null;
  hoveredPlaceId: string | null;
  sidebarMode: SidebarMode;
  setSelectedPlaceId: (id: string | null) => void;
  setHoveredPlaceId: (id: string | null) => void;
  setSidebarMode: (mode: SidebarMode) => void;
};

export const usePlannerStore = create<PlannerState>((set) => ({
  selectedPlaceId: null,
  hoveredPlaceId: null,
  sidebarMode: "places",
  setSelectedPlaceId: (id) => set({ selectedPlaceId: id }),
  setHoveredPlaceId: (id) => set({ hoveredPlaceId: id }),
  setSidebarMode: (mode) => set({ sidebarMode: mode }),
}));
