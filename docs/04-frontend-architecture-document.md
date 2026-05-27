# Wayvora Frontend Architecture Document

Stack: Next.js, TypeScript, Tailwind CSS, TanStack Query, Zustand, Zod, Axios, MapLibre GL JS

---

## 1. Frontend Responsibilities

The frontend is a responsive travel planning interface. It owns:

- Route planner UI.
- Trip dashboard.
- Authentication screens.
- Map rendering with MapLibre GL JS.
- Local UI state.
- Server state caching through TanStack Query.
- Form validation through Zod.
- Responsive and accessible user experience.

The frontend does not own:

- Secret Mapbox API calls.
- Route optimization algorithms.
- Authorization decisions.
- Persistent business state.

---

## 2. App Router Architecture

Suggested route structure:

```text
app/
  layout.tsx
  page.tsx
  (auth)/
    login/page.tsx
    register/page.tsx
  (dashboard)/
    dashboard/page.tsx
    trips/page.tsx
    trips/[tripId]/page.tsx
    settings/page.tsx
  api/
    health/route.ts
```

Route groups keep public auth pages separate from authenticated dashboard screens.

---

## 3. Feature-Based Folder Structure

```text
src/
  app/
  components/
    ui/
      button.tsx
      input.tsx
      modal.tsx
      tooltip.tsx
    layout/
      app-shell.tsx
      sidebar.tsx
      topbar.tsx
  features/
    auth/
      api/
      components/
      hooks/
      schemas/
      types.ts
    trips/
      api/
      components/
      hooks/
      schemas/
      types.ts
    planner/
      components/
        planner-map.tsx
        itinerary-sidebar.tsx
        place-search.tsx
        route-summary.tsx
      hooks/
      stores/
      types.ts
    places/
    routes/
  lib/
    api/
      http-client.ts
      api-error.ts
    mapbox/
      mapbox-config.ts
      geometry.ts
    query/
      query-client.ts
    validation/
  stores/
    auth.store.ts
    ui.store.ts
  styles/
    globals.css
```

Feature folders keep domain code close to the UI it powers. Shared primitives live in `components/ui`.

---

## 4. Component Strategy

Component categories:

| Category | Examples | Responsibility |
|---|---|---|
| UI primitives | Button, Input, Dialog | Reusable visual controls |
| Layout components | AppShell, Sidebar | Navigation and page structure |
| Feature components | TripCard, PlaceSearch | Domain-specific UI |
| Map components | PlannerMap, RouteLayer | Mapbox rendering |
| Form components | TripForm, LoginForm | Zod validation and submission |

Rules:

- Keep map rendering isolated to map components.
- Keep API calls inside hooks, not deep inside presentational components.
- Use controlled forms with schema validation.
- Use skeletons for loading states.

---

## 5. State Management Strategy

Wayvora uses two kinds of state:

### Server State: TanStack Query

Examples:

- Current user.
- Trip list.
- Trip details.
- Places in a trip.
- Optimized route.
- Favorites.

Server state is cached, invalidated, retried, and synchronized by TanStack Query.

### Client/UI State: Zustand

Examples:

- Sidebar open/closed.
- Selected map marker.
- Draft route view mode.
- Map viewport.
- Active planner tab.

Zustand should not duplicate backend data that TanStack Query already owns.

---

## 6. TanStack Query Architecture

Query key strategy:

```ts
export const tripKeys = {
  all: ['trips'] as const,
  lists: () => [...tripKeys.all, 'list'] as const,
  list: (filters: TripFilters) => [...tripKeys.lists(), filters] as const,
  detail: (tripId: string) => [...tripKeys.all, 'detail', tripId] as const,
  route: (tripId: string) => [...tripKeys.detail(tripId), 'route'] as const,
};
```

Example hook:

```ts
export function useTrip(tripId: string) {
  return useQuery({
    queryKey: tripKeys.detail(tripId),
    queryFn: () => tripsApi.getTrip(tripId),
    staleTime: 30_000,
  });
}
```

Mutation example:

```ts
export function useOptimizeTrip(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: OptimizeTripInput) =>
      routesApi.optimizeTrip(tripId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripKeys.detail(tripId) });
      queryClient.invalidateQueries({ queryKey: tripKeys.route(tripId) });
    },
  });
}
```

---

## 7. Zustand Store Architecture

Example planner store:

```ts
type PlannerState = {
  selectedPlaceId: string | null;
  hoveredPlaceId: string | null;
  sidebarMode: 'places' | 'route' | 'details';
  setSelectedPlaceId: (id: string | null) => void;
  setHoveredPlaceId: (id: string | null) => void;
  setSidebarMode: (mode: PlannerState['sidebarMode']) => void;
};

export const usePlannerStore = create<PlannerState>((set) => ({
  selectedPlaceId: null,
  hoveredPlaceId: null,
  sidebarMode: 'places',
  setSelectedPlaceId: (id) => set({ selectedPlaceId: id }),
  setHoveredPlaceId: (id) => set({ hoveredPlaceId: id }),
  setSidebarMode: (mode) => set({ sidebarMode: mode }),
}));
```

Guideline:

- Zustand state should be small and UI-focused.
- Do not store access tokens in long-lived global state if using HttpOnly refresh cookies.
- Avoid storing entire route geometry in Zustand.

---

## 8. API Integration Layer

Wayvora should use Axios as the frontend HTTP client. Axios gives the frontend a centralized place for request configuration, response normalization, auth headers, refresh-token retry behavior, and consistent API error handling.

Axios client responsibilities:

- Base URL configuration.
- Attach access token when needed.
- Parse API errors.
- Attempt token refresh on `401`.
- Avoid infinite refresh loops.

Example:

```ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const accessToken = authTokenStore.getAccessToken();

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshResponse = await axios.post<AuthRefreshResponse>(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      );

      authTokenStore.setAccessToken(refreshResponse.data.data.accessToken);
      originalRequest.headers.Authorization =
        `Bearer ${refreshResponse.data.data.accessToken}`;

      return apiClient(originalRequest);
    }

    return Promise.reject(ApiError.fromAxiosError(error));
  },
);
```

Feature API modules should wrap Axios calls so React components and TanStack Query hooks do not depend on raw endpoint details.

```ts
export const tripsApi = {
  async getTrip(tripId: string) {
    const response = await apiClient.get<ApiResponse<Trip>>(`/trips/${tripId}`);
    return response.data.data;
  },

  async createTrip(input: CreateTripInput) {
    const response = await apiClient.post<ApiResponse<Trip>>('/trips', input);
    return response.data.data;
  },

  async optimizeTrip(tripId: string, input: OptimizeTripInput) {
    const response = await apiClient.post<ApiResponse<OptimizedRoute>>(
      `/trips/${tripId}/optimize`,
      input,
    );

    return response.data.data;
  },
};
```

TanStack Query should call feature API modules:

```ts
export function useTrip(tripId: string) {
  return useQuery({
    queryKey: tripKeys.detail(tripId),
    queryFn: () => tripsApi.getTrip(tripId),
    staleTime: 30_000,
  });
}
```

Important implementation notes:

- Keep Axios instance creation in one shared module.
- Keep refresh retry guarded by `_retry` to avoid infinite loops.
- Prefer HttpOnly refresh token cookies with `withCredentials: true`.
- Store access token in memory or a short-lived auth store, not persistent local storage unless the security tradeoff is intentional.
- Normalize Axios errors into the same UI-facing `ApiError` shape.

---

## 9. Zod Validation

Frontend validation should match backend DTO expectations.

```ts
export const createTripSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
});
```

Validation benefits:

- Better user feedback.
- Fewer invalid API calls.
- Safer form state.
- Shared mental model with backend validation.

---

## 10. Map Rendering Strategy

MapLibre GL JS should be dynamically imported because it is browser-only and heavy.

```ts
const PlannerMap = dynamic(() => import('./planner-map'), {
  ssr: false,
  loading: () => <MapSkeleton />,
});
```

Map layers:

| Layer | Data Source | Purpose |
|---|---|---|
| Place markers | Trip places | Show stops |
| Route line | Route GeoJSON/polyline | Show optimized path |
| Selected marker highlight | UI state | Improve interaction |
| Bounding box fit | Route geometry | Focus map after optimization |

Map behavior:

- Fit bounds after route generation.
- Keep selected marker in sync with sidebar.
- Use marker clustering later for large trips.
- Avoid rerendering map instance on every React render.

---

## 11. Planner Page UX Architecture

Desktop layout:

```text
+-------------------------------------------------------+
| Topbar                                                |
+----------------------+--------------------------------+
| Itinerary Sidebar    | Map Canvas                     |
| - Search             | - Markers                      |
| - Places             | - Route line                   |
| - Optimize button    | - Controls                     |
| - Metrics            |                                |
+----------------------+--------------------------------+
```

Mobile layout:

```text
+-----------------------------+
| Topbar                      |
+-----------------------------+
| Map Canvas                  |
|                             |
+-----------------------------+
| Bottom Sheet Itinerary      |
| Search, stops, optimize     |
+-----------------------------+
```

---

## 12. Responsive Design Architecture

Tailwind breakpoints:

| Breakpoint | Experience |
|---|---|
| Mobile | Map first, bottom sheet planner |
| Tablet | Collapsible sidebar |
| Desktop | Fixed sidebar + full map |

Important constraints:

- Map height must be stable.
- Sidebar must scroll independently.
- Buttons must remain reachable on mobile.
- Route summary should not cover critical map controls.

---

## 13. Accessibility Considerations

- Keyboard-accessible forms and dialogs.
- Visible focus states.
- Semantic buttons for interactive controls.
- Screen-reader labels for icon buttons.
- Sufficient color contrast.
- Map interactions should have list equivalents.
- Drag-and-drop itinerary should support keyboard reordering.

---

## 14. Performance Optimization

| Area | Strategy |
|---|---|
| MapLibre bundle | Dynamic import map components |
| Route pages | Route-level code splitting |
| API data | TanStack Query stale times and cache |
| Large geometry | Store and render simplified geometry when possible |
| Re-renders | Memoize map sources/layers |
| Images/icons | Use optimized assets and lucide icons |
| Forms | Client-side validation before network |

Frontend performance bottlenecks:

- MapLibre GL JS bundle size.
- Re-rendering map layers on every state change.
- Rendering large route geometry.
- Excessive search requests while typing.

Mitigations:

- Debounce destination search.
- Use `useMemo` for GeoJSON sources.
- Use query cancellation.
- Lazy load heavy planner panels.

---

## 15. Loading, Empty, and Error States

| State | UX |
|---|---|
| Trip list loading | Skeleton trip rows |
| No trips | Empty state with create trip action |
| Place search loading | Inline spinner in search popover |
| Optimization loading | Disable optimize button, show progress label |
| Map loading | Neutral map skeleton |
| Route generation failed | Keep places visible, show retry |
| Token expired | Refresh silently or redirect to login |
