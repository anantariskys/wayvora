# Wayvora UI/UX Design Document

Product: Smart Travel Route Optimization Platform  
Design Goal: Modern, focused, map-first, planning-friendly

---

## 1. Design Philosophy

Wayvora should feel like a calm professional travel command center. The interface must make route planning feel powerful without overwhelming users.

Design principles:

- Map-first, not form-first.
- Optimized itinerary is the hero interaction.
- Dense but readable information.
- Clear distinction between places, routes, and trip metadata.
- Fast feedback for search, adding places, and optimization.
- Mobile planning should feel native, not like a squeezed desktop.

Visual direction:

- Modern SaaS interface.
- Strong map canvas.
- Clean side panels.
- Restrained color system.
- Clear route metrics.
- Avoid decorative clutter.

---

## 2. Core User Journey

```text
Register/Login
  -> Dashboard
  -> Create trip
  -> Search destinations
  -> Add places
  -> Optimize route
  -> Inspect itinerary
  -> Save and manage trip
```

The shortest successful journey should be possible in under two minutes.

---

## 3. Major Screens

### 3.1 Login/Register

Purpose:

- Allow secure account access.
- Establish trust.

UX details:

- Simple centered form.
- Clear validation messages.
- Password requirements visible only when useful.
- Redirect authenticated users to dashboard.

### 3.2 Dashboard

Purpose:

- Show saved trips.
- Create new trip quickly.
- Resume planning.

Elements:

- Top navigation.
- Trip list or grid.
- Search/filter trips.
- Create trip button.
- Empty state for new users.

Trip card content:

- Trip name.
- Date range.
- Place count.
- Last optimized time.
- Route distance/duration if available.

### 3.3 Trip Planner Page

This is the main product surface.

Desktop layout:

```text
+----------------------------------------------------------+
| App Topbar: Trip name, save status, account menu         |
+-------------------------+--------------------------------+
| Planner Sidebar         | Interactive Map                |
| - Destination search    | - Markers                      |
| - Itinerary list        | - Optimized route line         |
| - Route metrics         | - Zoom/geolocate controls      |
| - Optimize button       |                                |
+-------------------------+--------------------------------+
```

Planner sidebar sections:

- Search destination.
- Added places.
- Route summary.
- Optimization action.
- Warnings and errors.

### 3.4 Place Search

Behavior:

- Debounced search input.
- Results show name, address, category.
- Selecting result adds it to the trip.
- Duplicate places should be blocked with a clear message.

Search result item:

```text
Shibuya Crossing
Shibuya City, Tokyo, Japan
Landmark
```

### 3.5 Itinerary Sidebar

Purpose:

- Make route order understandable.
- Let users inspect and edit stops.

Each stop row:

- Position number.
- Place name.
- Address or area.
- Optional duration from previous stop.
- Drag handle.
- Remove button.
- Lock indicator in future versions.

### 3.6 Map Canvas

Purpose:

- Visualize spatial relationships.
- Show route geometry.
- Connect sidebar order with geography.

Map interactions:

- Click marker selects itinerary item.
- Hover itinerary item highlights marker.
- After optimization, fit bounds to route.
- Selected stop can show compact popup.
- Route line should be visually distinct from base map.

---

## 4. Onboarding Flow

First-time user:

1. Create account.
2. Land on dashboard empty state.
3. Click create trip.
4. Enter trip name and optional dates.
5. Planner opens with destination search focused.
6. User adds 3+ places.
7. Optimize button becomes prominent.

Good onboarding is embedded in the workflow. Avoid long tutorials.

---

## 5. Planner Interaction Details

### Add Destination

```text
Search -> Select result -> Marker appears -> Sidebar row appears -> Route marked stale
```

### Optimize Route

```text
Click Optimize
  -> Button loading state
  -> Backend optimization request
  -> Route line appears
  -> Sidebar order updates
  -> Metrics update
```

### Manual Reorder

```text
Drag item
  -> Local order updates optimistically
  -> Save reorder
  -> Route marked stale
  -> User can regenerate route
```

Route stale state should be visible but not alarming:

```text
Route needs refresh
```

---

## 6. Drag-and-Drop Interaction

Desktop:

- Drag handle on each itinerary row.
- Drop indicator line.
- Smooth reorder animation.
- Keyboard-accessible reorder actions.

Mobile:

- Long press or explicit reorder mode.
- Up/down controls as fallback.

Accessibility:

- Provide buttons for moving a stop up/down.
- Announce changed order to screen readers where practical.

---

## 7. Mobile Responsiveness

Mobile layout should prioritize map and planner actions:

```text
+-----------------------------+
| Topbar                      |
+-----------------------------+
| Map                         |
|                             |
+-----------------------------+
| Bottom sheet                |
| Search / Stops / Route      |
+-----------------------------+
```

Bottom sheet states:

- Collapsed: route summary and optimize button.
- Half: search and first few stops.
- Full: full itinerary editing.

Mobile constraints:

- Keep optimize action reachable.
- Avoid tiny map markers.
- Avoid covering route line with permanent panels.
- Keep search results scrollable.

---

## 8. Visual Hierarchy

Priority order on planner page:

1. Map and route.
2. Itinerary order.
3. Optimize action.
4. Route metrics.
5. Trip metadata.

Use typography carefully:

- Page title for trip name.
- Compact headings inside sidebar.
- Small metadata labels for route metrics.
- Avoid oversized headings in dense planner UI.

---

## 9. Loading States

| Area | Loading State |
|---|---|
| Dashboard trips | Skeleton list |
| Place search | Inline spinner |
| Add place | Disable selected result row briefly |
| Optimize route | Button loading plus route summary skeleton |
| Map | Map skeleton until Mapbox loads |
| Route geometry | Route line placeholder or progress indicator |

Optimization loading copy should be concrete:

```text
Calculating route...
```

---

## 10. Empty States

| State | Message Goal |
|---|---|
| No trips | Encourage creating first trip |
| No places in trip | Direct user to search |
| No search results | Suggest different query |
| No optimized route | Explain that optimization starts after adding places |

Empty states should include one primary action.

---

## 11. Error States

| Error | UX Handling |
|---|---|
| Search failed | Keep query, show retry |
| Add duplicate place | Inline warning |
| Optimization failed | Preserve current places and show retry |
| Map failed to load | Show fallback list-first planner |
| Unauthorized | Redirect to login after refresh attempt |
| Rate limited | Explain cooldown |

Never discard user-entered places because optimization failed.

---

## 12. Animation Ideas

Animations should clarify state changes:

- Marker drop when a place is added.
- Route line fade-in after optimization.
- Sidebar reorder transition.
- Bottom sheet snap on mobile.
- Subtle loading shimmer for skeletons.

Avoid animation that delays planning.

---

## 13. Accessibility Considerations

- All icon buttons need accessible labels.
- Color must not be the only route status indicator.
- Keyboard users must be able to reorder stops.
- Forms need visible labels or accessible labels.
- Map interactions need sidebar equivalents.
- Focus should move predictably after modals close.

---

## 14. Design System Notes

Suggested UI primitives:

- Button with variants: primary, secondary, ghost, destructive.
- Input with validation state.
- Dialog for create trip.
- Sheet for mobile planner.
- Tooltip for icon actions.
- Tabs or segmented controls for planner modes.
- Toasts for short feedback.

Avoid nested cards. The planner should feel like an application workspace, not a marketing page.

