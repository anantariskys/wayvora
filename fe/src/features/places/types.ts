import type { Place } from "@/features/planner/types";

export type PlaceSearchResult = Place & {
  importance?: number;
  boundingBox?: [number, number, number, number];
};

export type NominatimSearchResult = {
  place_id: number;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  type?: string;
  class?: string;
  importance?: number;
  boundingbox?: [string, string, string, string];
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
};

export type PhotonSearchResponse = {
  features: PhotonFeature[];
};

export type PhotonFeature = {
  geometry: {
    coordinates: [number, number];
  };
  properties: {
    osm_id?: number;
    osm_type?: string;
    name?: string;
    country?: string;
    city?: string;
    state?: string;
    county?: string;
    street?: string;
    postcode?: string;
    type?: string;
    extent?: [number, number, number, number];
  };
};
