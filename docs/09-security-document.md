# Wayvora Security Document

Scope: Frontend, backend, API, database, secrets, Mapbox usage

---

## 1. Security Goals

Wayvora must protect:

- User accounts.
- Trip data.
- Collaborator access.
- API tokens and provider secrets.
- Database credentials.
- Route and location history.

Location data can be sensitive. Even if trips are not financial records, they can reveal travel intent, schedules, and personal behavior.

---

## 2. Authentication Security

### JWT Access Tokens

Access tokens:

- Short-lived, recommended 10-15 minutes.
- Signed with strong secret or asymmetric key.
- Include minimal claims.

Example claims:

```json
{
  "sub": "2e7a70e4-00c7-4e98-8bdf-d6a1de63db02",
  "email": "maya@example.com",
  "role": "user",
  "iat": 1780000000,
  "exp": 1780000900
}
```

Do not put sensitive profile data or permissions snapshots that can become stale.

---

## 3. Refresh Token Rotation

Refresh tokens should be:

- Long-lived but revocable.
- Stored hashed in the database.
- Rotated on every refresh.
- Bound to a session family ID.

Flow:

```text
Client sends refresh token
  -> Backend hashes token
  -> Finds active token record
  -> Revokes old token
  -> Issues new refresh token
  -> Issues new access token
```

Reuse detection:

- If a revoked token is reused, assume theft.
- Revoke the entire token family.
- Require login.
- Log security event.

---

## 4. Password Hashing

Use Argon2id or bcrypt.

Recommended:

- Argon2id when available.
- Strong parameters tuned to deployment environment.
- Unique salt per password.
- Never log passwords.
- Never email passwords.

Password policy:

- Minimum 10-12 characters.
- Reject common breached passwords in future.
- Avoid overly complex rules that encourage weak patterns.

---

## 5. API Protection

All protected endpoints require:

- JWT guard.
- Ownership/collaborator policy checks.
- DTO validation.
- Rate limiting.

Sensitive actions:

- Login.
- Refresh.
- Optimize route.
- Invite collaborator.
- Delete trip.

These endpoints should have stricter logging and rate limits.

---

## 6. RBAC and Trip Authorization

Global roles:

- `user`
- `admin`

Trip-level roles:

- owner
- editor
- viewer

Policy examples:

| Action | Owner | Editor | Viewer |
|---|---:|---:|---:|
| View trip | Yes | Yes | Yes |
| Add place | Yes | Yes | No |
| Optimize route | Yes | Yes | No |
| Invite collaborator | Yes | No | No |
| Delete trip | Yes | No | No |

Every trip-scoped endpoint must check trip access server-side. Frontend hiding is not security.

---

## 7. CORS

Backend CORS should allow only known frontend origins:

- Local frontend origin in development.
- Vercel preview origins if needed.
- Production frontend domain.

Do not use wildcard CORS with credentials.

Example policy:

```text
origin: ["http://localhost:3000", "https://wayvora.vercel.app"]
credentials: true
methods: ["GET", "POST", "PATCH", "DELETE"]
```

---

## 8. SQL Injection Prevention

Drizzle parameterized queries reduce SQL injection risk.

Rules:

- Never concatenate user input into raw SQL.
- Validate sorting fields against an allowlist.
- Validate filters and pagination.
- Keep raw SQL rare and reviewed.

Bad:

```ts
sql.raw(`ORDER BY ${userInput}`)
```

Good:

```ts
const sortColumns = {
  createdAt: trips.createdAt,
  name: trips.name,
};
```

---

## 9. XSS Prevention

Frontend:

- Avoid `dangerouslySetInnerHTML`.
- Escape user-generated content by default.
- Sanitize rich text if future notes support formatting.
- Keep dependencies updated.

Backend:

- Validate string lengths.
- Normalize text fields.
- Avoid returning unsafe provider HTML.

Trip notes, reviews, and AI recommendations are user-visible content and should be treated as untrusted.

---

## 10. CSRF Mitigation

If refresh tokens are stored in HttpOnly cookies:

- Use `SameSite=Lax` or `SameSite=Strict` where possible.
- Use Secure cookies in production.
- Consider CSRF token for state-changing cookie-authenticated endpoints.
- Access tokens in Authorization headers reduce CSRF risk for API calls.

Recommended pattern:

- Refresh token in HttpOnly Secure SameSite cookie.
- Access token used in Authorization header.
- Refresh endpoint protected by SameSite and optional CSRF token.

---

## 11. Rate Limiting

Rate limiting protects:

- Auth endpoints from brute force.
- Mapbox spend from abuse.
- Optimization engine from overload.

Recommended limits:

| Endpoint | Limit |
|---|---|
| Login | 5/min/IP |
| Register | 10/hour/IP |
| Refresh | 30/min/user |
| Place search | 60/min/user |
| Optimization | 10/hour/user |

Use distributed rate limiting with Redis when backend scales horizontally.

---

## 12. API Key Security

Mapbox tokens:

- Public token can be used for Mapbox GL JS rendering.
- Secret token for Matrix/Directions should be backend-only.
- Restrict token scopes where provider supports it.
- Rotate tokens if exposed.
- Do not commit tokens.

Environment variables:

```text
MAPBOX_SECRET_TOKEN=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
DATABASE_URL=
```

---

## 13. Environment Variable Handling

Rules:

- `.env` is never committed.
- `.env.example` contains names but no secrets.
- Production secrets live in Vercel/Railway/hosting secret manager.
- Validate env at startup.
- Fail fast if required env vars are missing.

---

## 14. Backend/Frontend Separation Security

Benefits:

- Database credentials never reach browser.
- Secret Mapbox APIs are protected server-side.
- Auth and authorization are centralized.
- Backend can enforce rate limits independent of UI.

Risks:

- CORS misconfiguration.
- Token handling complexity.
- Frontend may accidentally assume hidden UI equals authorization.

Mitigation:

- Strong API policies.
- Contract tests.
- Secure defaults.
- Server-side permission checks everywhere.

---

## 15. Logging and Privacy

Do not log:

- Passwords.
- Raw refresh tokens.
- Full access tokens.
- Full precise location history unless needed.

Safe logs:

- User ID.
- Request ID.
- Endpoint.
- Status.
- Latency.
- Optimization stop count.
- Cache hit/miss.

Location data should be handled carefully because it can reveal personal travel plans.

