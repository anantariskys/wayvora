import axios from "axios";
import type {
  NominatimSearchResult,
  PhotonSearchResponse,
  PlaceSearchResult,
} from "../types";

const nominatimClient = axios.create({
  baseURL: "https://nominatim.openstreetmap.org",
  timeout: 8000,
  headers: {
    Accept: "application/json",
  },
});

const photonClient = axios.create({
  baseURL: "https://photon.komoot.io",
  timeout: 8000,
  headers: {
    Accept: "application/json",
  },
});

export const placesApi = {
  async searchPlaces(
    query: string,
    proximity?: { latitude: number; longitude: number },
  ): Promise<PlaceSearchResult[]> {
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
      return [];
    }

    try {
      const photonResults = await searchWithPhoton(normalizedQuery, proximity);

      if (photonResults.length > 0) {
        return sortByProximity(dedupePlaces(photonResults), proximity);
      }
    } catch {
      // Photon is a public free service. Fall through to Nominatim if it is slow
      // or temporarily unavailable.
    }

    try {
      const response = await nominatimClient.get<NominatimSearchResult[]>(
        "/search",
        {
          params: {
            q: normalizedQuery,
            format: "jsonv2",
            addressdetails: 1,
            namedetails: 0,
            limit: 6,
            dedupe: 1,
            ...(proximity
              ? {
                  viewbox: buildViewbox(proximity, 0.35),
                  bounded: 0,
                }
              : {}),
          },
        },
      );

      const nominatimResults = response.data.map(mapNominatimResult);

      if (nominatimResults.length > 0) {
        return sortByProximity(dedupePlaces(nominatimResults), proximity);
      }
    } catch {
      // Keep the UI useful during provider outages or local network blocking.
    }

    return sortByProximity(
      dedupePlaces(searchLocalFallback(normalizedQuery)),
      proximity,
    );
  },
};

async function searchWithPhoton(
  query: string,
  proximity?: { latitude: number; longitude: number },
): Promise<PlaceSearchResult[]> {
  const response = await photonClient.get<PhotonSearchResponse>("/api", {
    params: {
      q: query,
      limit: 6,
      lang: "en",
      ...(proximity
        ? {
            lat: proximity.latitude,
            lon: proximity.longitude,
          }
        : {}),
    },
  });

  return response.data.features.map((feature) => {
    const [longitude, latitude] = feature.geometry.coordinates;
    const props = feature.properties;
    const city = props.city ?? props.county ?? props.state ?? "";
    const addressParts = [
      props.name,
      props.street,
      props.city,
      props.state,
      props.country,
    ].filter(Boolean);

    return {
      id: `osm_${props.osm_type ?? "node"}_${props.osm_id ?? `${latitude}_${longitude}`}`,
      provider: "osm",
      providerPlaceId: `${props.osm_type ?? "node"}:${props.osm_id ?? `${latitude},${longitude}`}`,
      name: props.name ?? query,
      address: addressParts.join(", "),
      city,
      country: props.country ?? "",
      latitude,
      longitude,
      category: props.type ?? "place",
      boundingBox: props.extent
        ? [props.extent[3], props.extent[1], props.extent[0], props.extent[2]]
        : undefined,
    };
  });
}

function mapNominatimResult(result: NominatimSearchResult): PlaceSearchResult {
  const city =
    result.address?.city ??
    result.address?.town ??
    result.address?.village ??
    result.address?.municipality ??
    result.address?.state ??
    "";

  return {
    id: `osm_${result.osm_type}_${result.osm_id}`,
    provider: "osm",
    providerPlaceId: `${result.osm_type}:${result.osm_id}`,
    name: result.name || result.display_name.split(",")[0] || "Unnamed place",
    address: result.display_name,
    city,
    country: result.address?.country ?? "",
    latitude: Number(result.lat),
    longitude: Number(result.lon),
    category: result.type ?? result.class ?? "place",
    importance: result.importance,
    boundingBox: result.boundingbox
      ? [
          Number(result.boundingbox[0]),
          Number(result.boundingbox[1]),
          Number(result.boundingbox[2]),
          Number(result.boundingbox[3]),
        ]
      : undefined,
  };
}

const localFallbackPlaces: PlaceSearchResult[] = [
  {
    id: "fallback_jakarta",
    provider: "osm",
    providerPlaceId: "fallback:jakarta",
    name: "Jakarta",
    address: "Jakarta, Special Capital Region of Jakarta, Indonesia",
    city: "Jakarta",
    country: "Indonesia",
    latitude: -6.1754,
    longitude: 106.8272,
    category: "city",
  },
  {
    id: "fallback_monas",
    provider: "osm",
    providerPlaceId: "fallback:monas",
    name: "Monas",
    address: "Merdeka Square, Central Jakarta, Indonesia",
    city: "Jakarta",
    country: "Indonesia",
    latitude: -6.1754,
    longitude: 106.8272,
    category: "monument",
  },
  {
    id: "fallback_kota_tua",
    provider: "osm",
    providerPlaceId: "fallback:kota_tua",
    name: "Kota Tua Jakarta",
    address: "Old Town, West Jakarta, Indonesia",
    city: "Jakarta",
    country: "Indonesia",
    latitude: -6.1352,
    longitude: 106.8133,
    category: "attraction",
  },
  {
    id: "fallback_bundaran_hi",
    provider: "osm",
    providerPlaceId: "fallback:bundaran_hi",
    name: "Bundaran HI",
    address: "Central Jakarta, Indonesia",
    city: "Jakarta",
    country: "Indonesia",
    latitude: -6.1944,
    longitude: 106.823,
    category: "landmark",
  },
];

function searchLocalFallback(query: string) {
  const normalizedQuery = query.toLowerCase();

  return localFallbackPlaces.filter((place) =>
    [place.name, place.address, place.city, place.country, place.category].some(
      (value) => value.toLowerCase().includes(normalizedQuery),
    ),
  );
}

function dedupePlaces(places: PlaceSearchResult[]) {
  const seen = new Set<string>();

  return places.filter((place) => {
    const key = `${place.provider}:${place.providerPlaceId}:${place.latitude}:${place.longitude}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function sortByProximity(
  places: PlaceSearchResult[],
  proximity?: { latitude: number; longitude: number },
) {
  if (!proximity) {
    return places;
  }

  return [...places].sort(
    (a, b) => getDistanceMeters(proximity, a) - getDistanceMeters(proximity, b),
  );
}

function buildViewbox(
  proximity: { latitude: number; longitude: number },
  delta: number,
) {
  const left = proximity.longitude - delta;
  const right = proximity.longitude + delta;
  const top = proximity.latitude + delta;
  const bottom = proximity.latitude - delta;

  return `${left},${top},${right},${bottom}`;
}

function getDistanceMeters(
  origin: { latitude: number; longitude: number },
  place: { latitude: number; longitude: number },
) {
  const earthRadiusMeters = 6_371_000;
  const originLat = toRadians(origin.latitude);
  const placeLat = toRadians(place.latitude);
  const deltaLat = toRadians(place.latitude - origin.latitude);
  const deltaLng = toRadians(place.longitude - origin.longitude);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(originLat) * Math.cos(placeLat) * Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
