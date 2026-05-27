# Wayvora API Specification Document

Style: REST API  
Base URL: `/api/v1`  
Auth: Bearer JWT access token with refresh token strategy

---

## 1. API Design Principles

Wayvora API is resource-oriented, predictable, and frontend-friendly.

Principles:

- Use nouns for resources.
- Use HTTP status codes correctly.
- Keep response shapes consistent.
- Validate all inputs.
- Enforce ownership and collaborator permissions in every protected route.
- Return realistic route and optimization payloads without leaking provider secrets.

---

## 2. Endpoint Conventions

| Convention | Example |
|---|---|
| Collection | `GET /trips` |
| Single resource | `GET /trips/:tripId` |
| Create | `POST /trips` |
| Update | `PATCH /trips/:tripId` |
| Delete | `DELETE /trips/:tripId` |
| Resource action | `POST /trips/:tripId/optimize` |
| Nested resource | `GET /trips/:tripId/places` |

Response envelope:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "req_01JZ4K9ZQ6W8NA3B0EAM6S7B8T"
  }
}
```

Error envelope:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": [
      {
        "field": "name",
        "message": "name must be longer than or equal to 2 characters"
      }
    ]
  },
  "meta": {
    "requestId": "req_01JZ4KA2RVM5S2X8N7YZQ54Q6T"
  }
}
```

---

## 3. Authentication Flow

### Register

`POST /auth/register`

Request:

```json
{
  "email": "maya@example.com",
  "password": "Str0ngPassword!2026",
  "fullName": "Maya Santoso"
}
```

Response `201`:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "2e7a70e4-00c7-4e98-8bdf-d6a1de63db02",
      "email": "maya@example.com",
      "fullName": "Maya Santoso",
      "role": "user"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Login

`POST /auth/login`

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "2e7a70e4-00c7-4e98-8bdf-d6a1de63db02",
      "email": "maya@example.com",
      "fullName": "Maya Santoso",
      "role": "user"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900
  }
}
```

### Refresh Token

`POST /auth/refresh`

The refresh token is preferably sent as an HttpOnly secure cookie.

Response:

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900
  }
}
```

### Logout

`POST /auth/logout`

Revokes the active refresh token.

---

## 4. Authorization

Protected endpoints require:

```http
Authorization: Bearer <access_token>
```

Authorization levels:

| Access | Rule |
|---|---|
| Trip owner | Full control |
| Trip editor | Add, update, reorder places; optimize route |
| Trip viewer | Read-only |
| Admin | Operational access |

---

## 5. Trip CRUD

### Create Trip

`POST /trips`

Request:

```json
{
  "name": "Tokyo Spring Route",
  "description": "Four-day city itinerary focused on food, temples, and neighborhoods.",
  "startDate": "2026-04-10",
  "endDate": "2026-04-14"
}
```

Response `201`:

```json
{
  "success": true,
  "data": {
    "id": "f05b1786-d9e6-4dd4-83e1-57268c7e646d",
    "name": "Tokyo Spring Route",
    "description": "Four-day city itinerary focused on food, temples, and neighborhoods.",
    "status": "draft",
    "visibility": "private",
    "startDate": "2026-04-10",
    "endDate": "2026-04-14",
    "createdAt": "2026-05-27T10:43:11.000Z"
  }
}
```

### List Trips

`GET /trips?page=1&limit=20&sort=createdAt:desc&status=draft`

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "f05b1786-d9e6-4dd4-83e1-57268c7e646d",
      "name": "Tokyo Spring Route",
      "placeCount": 8,
      "lastOptimizedAt": "2026-05-27T11:04:30.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

### Get Trip Detail

`GET /trips/:tripId`

Includes trip places and latest route summary.

### Update Trip

`PATCH /trips/:tripId`

### Delete Trip

`DELETE /trips/:tripId`

Returns `204 No Content`.

---

## 6. Destination Search

`GET /places/search?q=Shibuya&proximity=139.7004,35.6595&limit=5`

Response:

```json
{
  "success": true,
  "data": [
    {
      "provider": "mapbox",
      "providerPlaceId": "poi.123456789",
      "name": "Shibuya Crossing",
      "address": "Shibuya City, Tokyo, Japan",
      "city": "Tokyo",
      "country": "Japan",
      "latitude": 35.6595,
      "longitude": 139.7004,
      "category": "landmark"
    }
  ]
}
```

Search should be debounced on the frontend and rate-limited on the backend.

---

## 7. Trip Places

### Add Place to Trip

`POST /trips/:tripId/places`

Request:

```json
{
  "place": {
    "provider": "mapbox",
    "providerPlaceId": "poi.123456789",
    "name": "Shibuya Crossing",
    "address": "Shibuya City, Tokyo, Japan",
    "city": "Tokyo",
    "country": "Japan",
    "latitude": 35.6595,
    "longitude": 139.7004,
    "category": "landmark"
  },
  "notes": "Best around sunset.",
  "dayNumber": 1
}
```

Response:

```json
{
  "success": true,
  "data": {
    "tripPlaceId": "4f9b5e12-5020-4318-8283-85e8098c2531",
    "position": 3,
    "place": {
      "id": "51ec65fb-5328-4690-948a-8e2dd30be7b8",
      "name": "Shibuya Crossing",
      "latitude": 35.6595,
      "longitude": 139.7004
    }
  }
}
```

### Reorder Places

`PATCH /trips/:tripId/places/reorder`

Request:

```json
{
  "orderedTripPlaceIds": [
    "1ef27b9c-3013-49c2-a34a-5f6afab38429",
    "4f9b5e12-5020-4318-8283-85e8098c2531",
    "6db88f1b-98b9-44be-bbd5-2f13d4647104"
  ]
}
```

---

## 8. Optimization Endpoint

`POST /trips/:tripId/optimize`

Request:

```json
{
  "profile": "driving",
  "startTripPlaceId": "1ef27b9c-3013-49c2-a34a-5f6afab38429",
  "returnToStart": false,
  "respectLockedPlaces": true
}
```

Response:

```json
{
  "success": true,
  "data": {
    "tripId": "f05b1786-d9e6-4dd4-83e1-57268c7e646d",
    "routeId": "6db88f1b-98b9-44be-bbd5-2f13d4647104",
    "algorithm": "nearest_neighbor",
    "profile": "driving",
    "orderedStops": [
      {
        "tripPlaceId": "1ef27b9c-3013-49c2-a34a-5f6afab38429",
        "position": 1,
        "name": "Tokyo Station",
        "latitude": 35.6812,
        "longitude": 139.7671
      },
      {
        "tripPlaceId": "4f9b5e12-5020-4318-8283-85e8098c2531",
        "position": 2,
        "name": "Ginza",
        "latitude": 35.6717,
        "longitude": 139.7650
      }
    ],
    "summary": {
      "totalDistanceMeters": 18400,
      "totalDurationSeconds": 3120,
      "matrixCacheHit": true,
      "optimizationRuntimeMs": 3,
      "providerRuntimeMs": 520
    },
    "geometry": {
      "type": "LineString",
      "coordinates": [
        [139.7671, 35.6812],
        [139.7650, 35.6717]
      ]
    }
  }
}
```

Status codes:

| Code | Meaning |
|---|---|
| `200` | Optimized successfully |
| `400` | Not enough places or invalid request |
| `401` | Missing/invalid token |
| `403` | No permission |
| `404` | Trip not found |
| `409` | Optimization already running |
| `429` | Rate limit exceeded |
| `502` | Mapbox provider error |

---

## 9. Route Generation Endpoint

`POST /trips/:tripId/routes/generate`

Used when user manually reorders places and wants route geometry for current order without running optimization.

Request:

```json
{
  "profile": "walking",
  "orderedTripPlaceIds": [
    "1ef27b9c-3013-49c2-a34a-5f6afab38429",
    "4f9b5e12-5020-4318-8283-85e8098c2531"
  ]
}
```

---

## 10. Collaborative Trip Endpoints

### Invite Collaborator

`POST /trips/:tripId/collaborators`

Request:

```json
{
  "email": "friend@example.com",
  "role": "editor"
}
```

### List Collaborators

`GET /trips/:tripId/collaborators`

### Update Collaborator Role

`PATCH /trips/:tripId/collaborators/:collaboratorId`

Request:

```json
{
  "role": "viewer"
}
```

### Remove Collaborator

`DELETE /trips/:tripId/collaborators/:collaboratorId`

---

## 11. Filtering, Pagination, and Sorting

Conventions:

```text
?page=1&limit=20
?sort=createdAt:desc
?status=draft
?q=tokyo
```

Pagination response:

```json
{
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 184,
    "totalPages": 10
  }
}
```

For high-volume lists later, switch from offset pagination to cursor pagination.

---

## 12. Validation Examples

Invalid create trip:

```json
{
  "name": ""
}
```

Response `400`:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": [
      {
        "field": "name",
        "message": "name must be longer than or equal to 2 characters"
      }
    ]
  }
}
```

---

## 13. API Error Codes

| Code | HTTP | Description |
|---|---:|---|
| `VALIDATION_ERROR` | 400 | Request DTO failed validation |
| `UNAUTHORIZED` | 401 | Missing or invalid access token |
| `FORBIDDEN` | 403 | Authenticated but not allowed |
| `TRIP_NOT_FOUND` | 404 | Trip does not exist or inaccessible |
| `PLACE_ALREADY_EXISTS` | 409 | Place already attached to trip |
| `OPTIMIZATION_LIMIT_EXCEEDED` | 400 | Too many stops for current tier |
| `MAPBOX_RATE_LIMITED` | 502 | Provider rate limit or upstream issue |
| `RATE_LIMITED` | 429 | Wayvora rate limit exceeded |

