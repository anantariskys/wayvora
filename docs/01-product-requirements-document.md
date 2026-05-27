# Wayvora Product Requirements Document

Tagline: **Smart Travel Route Optimization Platform**

Status: Planning  
Audience: Founders, Product, Engineering, Design, Investors, Recruiters  
Primary Feature: Travel Route Optimization

---

## 1. Executive Summary

Wayvora is a modern fullstack travel planning platform that helps users build optimized travel itineraries by combining destination search, interactive maps, route optimization algorithms, and geospatial intelligence.

The product solves a common travel planning problem: users know where they want to go, but they do not know the best order to visit places, how travel time affects the plan, or how to convert a list of destinations into a realistic route. Wayvora turns unordered destination ideas into optimized, map-based itineraries.

Wayvora is designed as a production-grade SaaS-style portfolio project with separated frontend and backend services:

| Layer | Stack |
|---|---|
| Frontend | Next.js, TypeScript, Tailwind CSS, TanStack Query, Zustand, Axios |
| Backend | NestJS, TypeScript, REST API, JWT, Refresh Tokens, RBAC |
| Database | Neon PostgreSQL, Drizzle ORM |
| Maps | MapLibre GL JS for frontend rendering, OpenStreetMap raster tiles for MVP |
| Deployment | Vercel, Railway or Docker VPS, Neon |

The MVP uses a Nearest Neighbor heuristic for route optimization and a future-ready optimization module that can later support 2-opt, Genetic Algorithm, Simulated Annealing, time windows, cost functions, user preferences, and PostGIS-powered nearby search.

---

## 2. Product Vision

Wayvora should become a smart itinerary workspace where travelers can plan trips visually, optimize route order automatically, and manage travel decisions with confidence.

The product vision is not only "show places on a map." Wayvora should feel like an intelligent planning layer over the map:

- Users can collect destination ideas.
- The system understands travel distance and route feasibility.
- The planner recommends an efficient visit order.
- The map explains the route visually.
- Saved itineraries become reusable, shareable travel assets.

Long term, Wayvora can evolve into a travel intelligence platform with collaboration, budget planning, AI recommendations, crowd-sourced place reviews, transport-mode comparison, and geospatial personalization.

---

## 3. Problem Statement

Travelers often plan routes manually using fragmented tools:

- Search destinations in Google, TikTok, Instagram, blogs, or maps.
- Save places in notes or spreadsheets.
- Manually reorder places based on intuition.
- Switch between map apps to estimate travel time.
- Recalculate routes whenever the plan changes.

This creates planning friction. The user may waste time, create inefficient routes, or miss nearby opportunities.

Wayvora centralizes travel planning around route intelligence:

1. Search and add destinations.
2. Build a trip list.
3. Optimize the order.
4. Visualize the full route.
5. Save and revise the itinerary.

---

## 4. User Pain Points

| Pain Point | User Impact | Wayvora Solution |
|---|---|---|
| Manual route planning is slow | Users spend hours comparing locations | Automatic route optimization |
| Destination order is hard to reason about | Users create inefficient travel days | Distance matrix and heuristic routing |
| Map apps optimize only immediate navigation | Users need itinerary-level planning | Multi-stop itinerary model |
| Travel plans are scattered | Notes, maps, and bookings are disconnected | Central trip workspace |
| Replanning is painful | A single changed place breaks the route | Recalculate route on demand |
| Collaboration is messy | Friends edit different copies | Future collaborative trips |

---

## 5. Business Goals

| Goal | Description |
|---|---|
| Validate user demand | Confirm that travelers value route-optimized planning |
| Demonstrate technical depth | Showcase geospatial, backend, frontend, and DevOps quality |
| Create SaaS foundation | Build architecture that can support subscriptions and teams |
| Support future monetization | Premium optimization, AI recommendations, collaboration, export |
| Build market differentiation | Focus on itinerary optimization rather than generic trip notes |

---

## 6. Engineering Goals

| Goal | Requirement |
|---|---|
| Service separation | Frontend and backend deployed independently |
| Type safety | TypeScript across frontend/backend, Drizzle typed schemas |
| Secure auth | JWT access tokens, refresh token rotation, RBAC |
| Scalable routing | Optimization module isolated from trip CRUD |
| Map provider abstraction | Mapbox integration behind backend services where appropriate |
| Fast UX | TanStack Query caching, optimistic updates, lazy map loading |
| Database correctness | Normalized PostgreSQL schema with indexes and constraints |
| Future geospatial support | Schema compatible with PostGIS and spatial indexes |
| Operational readiness | Logging, monitoring, rate limiting, CI/CD |

---

## 7. Target Audience

Primary users:

- Independent travelers planning city trips.
- Backpackers planning multi-city or multi-place itineraries.
- Families planning efficient daily routes.
- Digital nomads exploring unfamiliar cities.
- Travel creators building route guides.

Secondary users:

- Tour operators designing routes.
- Local guides creating itinerary templates.
- Recruiters and technical reviewers evaluating the project.

---

## 8. User Personas

### Persona 1: The Efficient City Traveler

Name: Maya  
Age: 28  
Context: Visiting Tokyo for four days  
Goal: Visit 8 to 12 attractions without wasting time in transit  
Pain: She does not know which places should be grouped by area  
Success Moment: Wayvora reorders places and shows a clean route on the map

### Persona 2: The Group Trip Planner

Name: Arif  
Age: 31  
Context: Planning a Bali trip with friends  
Goal: Combine everyone's favorite places into one plan  
Pain: Friends keep adding places without considering distance  
Success Moment: Wayvora shows route impact and saves a shared itinerary

### Persona 3: The Portfolio Reviewer

Name: Sarah  
Role: Senior Engineering Manager  
Context: Reviewing a candidate project  
Goal: Evaluate architecture, code quality, and product thinking  
Pain: Most portfolio apps are CRUD-only and shallow  
Success Moment: Wayvora demonstrates real system design, geospatial thinking, auth, optimization, and deployment maturity

---

## 9. Competitive Analysis

| Product | Strengths | Weaknesses | Wayvora Differentiation |
|---|---|---|---|
| Google Maps | Strong search, navigation, reviews | Not itinerary-first, limited planning workflow | Trip-centric optimization and saved itineraries |
| Wanderlog | Good travel planning UX | Optimization can feel secondary | Engineering-heavy route intelligence focus |
| Roadtrippers | Strong road trip use case | Less flexible for city micro-itineraries | Multi-context route optimization |
| TripIt | Good booking organization | Not route optimization focused | Maps-first destination ordering |
| Notion/Sheets | Flexible | Manual and non-geospatial | Automated matrix-based planning |

---

## 10. Feature Scope

### Core Features

| Feature | MVP | Notes |
|---|---:|---|
| User registration/login | Yes | JWT and refresh token |
| Trip CRUD | Yes | Owner-based authorization |
| Destination search | Yes | Mapbox geocoding/search integration |
| Add places to trip | Yes | Ordered list support |
| Optimize route | Yes | Nearest Neighbor for MVP |
| Generate route geometry | Yes | Mapbox Directions API |
| Interactive map | Yes | MapLibre GL JS |
| Save itinerary | Yes | Persist route and places |
| Favorites | Yes | Save places for reuse |
| Reviews | Basic | User-authored place notes/reviews |
| Collaboration | V2 | Trip collaborator roles |
| AI recommendations | V2 | Stored recommendations table |

---

## 11. MVP Scope

The MVP should prove the core loop:

```text
Create trip -> Search places -> Add places -> Optimize route -> View map -> Save itinerary
```

MVP functional requirements:

- User can create an account.
- User can log in and refresh sessions securely.
- User can create, update, delete, and list trips.
- User can search destinations using Mapbox-backed search.
- User can add multiple destinations to a trip.
- User can reorder destinations manually.
- User can request route optimization.
- Backend calls Mapbox Matrix API for travel durations/distances.
- Backend runs Nearest Neighbor optimization.
- Backend stores optimized order and route summary.
- Frontend renders markers, route line, itinerary sidebar, and route metrics.

MVP non-functional requirements:

- API p95 response target under 500 ms for CRUD.
- Optimization p95 under 3 seconds for up to 25 destinations, excluding Mapbox latency.
- Secure token refresh strategy.
- Database indexes for user-owned trip queries.
- Clean error handling and observability hooks.

---

## 12. V2 Roadmap

| Area | Feature | Value |
|---|---|---|
| Optimization | 2-opt improvement after Nearest Neighbor | Better route quality |
| Collaboration | Shared trips with editor/viewer roles | Group planning |
| AI | Recommend places based on theme and location | Discovery |
| Geospatial | Nearby search and radius filters | Better local exploration |
| UX | Drag-and-drop itinerary with recalculation | Planner ergonomics |
| Export | PDF/share link/calendar export | Real-world utility |
| Notifications | Invite and trip updates | Collaboration loop |

---

## 13. Long-Term Roadmap

- Multi-day itinerary optimization with time windows.
- Budget-aware route planning.
- Public route templates and creator pages.
- Offline itinerary snapshot.
- Advanced transport mode comparison.
- PostGIS-based local search and clustering.
- Trip marketplace for guides and creators.
- Paid subscription tiers:
  - Free: limited trips and places.
  - Pro: advanced optimization, export, collaboration.
  - Teams: tour operators and travel agencies.

---

## 14. KPIs and Success Metrics

### Product KPIs

| KPI | Target |
|---|---|
| Trip creation conversion | 40% of registered users create one trip |
| Optimization usage | 60% of trips with 3+ places optimized |
| Saved itinerary rate | 50% of optimized trips saved |
| Weekly active users | Growth after initial launch |
| Place additions per trip | Median 5+ |

### Engineering KPIs

| KPI | Target |
|---|---|
| API uptime | 99.5% MVP, 99.9% later |
| CRUD p95 latency | < 500 ms |
| Optimization p95 latency | < 3 s for <= 25 stops |
| Frontend LCP | < 2.5 s on production |
| Error rate | < 1% API errors excluding validation |

---

## 15. Business Value

Wayvora can become a monetizable planning product because route optimization sits close to user intent. Travelers planning routes are already near decisions about hotels, transport, tours, and paid experiences.

Potential business models:

- Freemium SaaS.
- Affiliate booking integrations.
- Paid itinerary exports.
- Creator route templates.
- B2B planning tools for small tour operators.

---

## 16. Technical Value

Wayvora is technically valuable because it is not a trivial CRUD app. It combines:

- Auth and authorization.
- Geospatial APIs.
- Algorithmic optimization.
- Database modeling.
- Interactive frontend maps.
- Caching and rate limiting.
- Deployment architecture.
- Future-ready geospatial database design.

---

## 17. Portfolio Value

Wayvora is positioned as a portfolio-quality engineering project because it demonstrates product thinking, architecture depth, and realistic tradeoffs:

- Frontend/backend separation.
- Typed fullstack architecture.
- Production auth flows.
- Route optimization algorithm design.
- Mapbox integration.
- PostgreSQL schema design.
- DevOps deployment story.
- Testing strategy.

For interviews, the project can be presented as a miniature SaaS platform rather than a demo app.
