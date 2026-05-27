# Wayvora DevOps and Deployment Document

Frontend: Vercel  
Backend: Railway or Docker VPS  
Database: Neon PostgreSQL  
Architecture: Separated services

---

## 1. Deployment Goals

Wayvora deployment should be:

- Reproducible.
- Environment-driven.
- Secure by default.
- Easy to preview.
- Observable.
- Scalable from portfolio MVP to startup-grade production.

---

## 2. Environments

| Environment | Purpose |
|---|---|
| Local | Developer machine |
| Preview | Pull request / branch previews |
| Staging | Production-like validation |
| Production | Real users |

Each environment needs separate:

- API URL.
- Database branch or database.
- JWT secrets.
- Mapbox token configuration.
- CORS origins.

---

## 3. Local Development Setup

Recommended local services:

```text
frontend: http://localhost:3000
backend:  http://localhost:4000
database: Neon dev branch or local PostgreSQL
```

Example commands:

```bash
pnpm install
pnpm dev
```

Backend local env:

```text
DATABASE_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
MAPBOX_SECRET_TOKEN=
CORS_ORIGIN=http://localhost:3000
```

Frontend local env:

```text
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_MAPBOX_PUBLIC_TOKEN=
```

---

## 4. Docker Architecture

Backend Dockerfile concept:

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
CMD ["node", "dist/main.js"]
```

Docker Compose for local infrastructure can include:

- API service.
- PostgreSQL local service.
- Redis future service.

---

## 5. CI/CD Pipeline

Recommended GitHub Actions flow:

```text
Pull request
  -> Install dependencies
  -> Lint
  -> Typecheck
  -> Unit tests
  -> Integration tests
  -> Build frontend
  -> Build backend

Merge to main
  -> Deploy frontend to Vercel
  -> Deploy backend to Railway/VPS
  -> Run migrations
  -> Smoke test
```

Deployment gates:

- No type errors.
- No failing tests.
- Backend health check passes.
- Database migration succeeds.

---

## 6. Vercel Frontend Deployment

Vercel responsibilities:

- Build Next.js frontend.
- Serve static assets.
- Provide preview deployments.
- Manage frontend environment variables.

Environment variables:

```text
NEXT_PUBLIC_API_URL=https://api.wayvora.example.com/api/v1
NEXT_PUBLIC_MAPBOX_PUBLIC_TOKEN=pk...
```

Important:

- Only expose public tokens with `NEXT_PUBLIC_`.
- Do not put backend secrets in Vercel frontend env.
- Configure allowed API origins in backend CORS.

---

## 7. Railway Backend Deployment

Railway is suitable for MVP because:

- Simple deployment from GitHub.
- Managed environment variables.
- Logs and metrics.
- Easy service restarts.

Backend environment variables:

```text
NODE_ENV=production
PORT=4000
DATABASE_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
MAPBOX_SECRET_TOKEN=
CORS_ORIGIN=https://wayvora.vercel.app
```

Health endpoint:

```text
GET /api/v1/health
```

Should return:

```json
{
  "status": "ok",
  "database": "ok",
  "timestamp": "2026-05-27T12:00:00.000Z"
}
```

---

## 8. Docker VPS Deployment

Docker VPS is better when:

- More control is needed.
- Running workers and Redis.
- Cost optimization matters.
- Custom networking is required.

Suggested stack:

- Docker Compose.
- Nginx or Caddy reverse proxy.
- TLS via Let's Encrypt.
- API container.
- Worker container later.
- Redis container later.

```text
Internet
  -> Nginx/Caddy
  -> api:4000
  -> worker
  -> Redis
  -> Neon PostgreSQL
```

---

## 9. Neon Deployment Considerations

Use Neon for:

- Production database.
- Preview branches.
- Staging branch.

Best practices:

- Use pooled connection string for runtime.
- Use direct connection for migrations if needed.
- Keep migration history in repo.
- Enable backups.
- Monitor connection usage.

Migration flow:

```text
Build backend
  -> Run migration command
  -> Start application
  -> Health check
```

---

## 10. Environment Management

Environment validation should happen at app startup.

Example:

```ts
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  MAPBOX_SECRET_TOKEN: z.string().min(20),
  CORS_ORIGIN: z.string(),
});
```

Rules:

- Maintain `.env.example`.
- Never commit `.env`.
- Rotate secrets if exposed.
- Use different secrets per environment.

---

## 11. Monitoring

Track:

- API latency.
- Error rate.
- Optimization latency.
- Matrix cache hit rate.
- Mapbox failures.
- Database connection pool usage.
- Memory and CPU.

Tools:

- Railway/Vercel dashboards for MVP.
- Sentry for errors.
- OpenTelemetry later.
- Logtail/Datadog/Grafana later.

---

## 12. Logging

Use structured logs:

```json
{
  "level": "info",
  "requestId": "req_01J...",
  "method": "POST",
  "path": "/api/v1/trips/f05/optimize",
  "statusCode": 200,
  "latencyMs": 842,
  "userId": "2e7a70e4-00c7-4e98-8bdf-d6a1de63db02",
  "stopCount": 8,
  "matrixCacheHit": true
}
```

Do not log secrets or raw tokens.

---

## 13. Backup Strategy

Neon provides managed backup capabilities, but the application should still define recovery expectations.

Recommended:

- Daily backups for production.
- Test restore process periodically.
- Export critical schema migrations.
- Keep seed scripts separate from production data.

Recovery objectives:

| Objective | MVP Target |
|---|---|
| RPO | 24 hours |
| RTO | 4 hours |

---

## 14. Scaling Strategy

### Phase 1: MVP

- Single backend instance.
- Neon PostgreSQL.
- PostgreSQL cache table.
- Vercel frontend.

### Phase 2: Growth

- Multiple backend instances.
- Redis for distributed rate limiting and queues.
- Worker process for optimization.
- Better monitoring and alerts.

### Phase 3: Production SaaS

- Dedicated workers.
- Queue-based route optimization.
- Read replicas for analytics.
- Advanced PostGIS indexes.
- Tier-aware quotas.

---

## 15. Release Checklist

Before production release:

- Environment variables configured.
- CORS production origin set.
- Database migrations applied.
- Health endpoint passes.
- Auth smoke test passes.
- Optimization smoke test passes with mocked or real small route.
- Error tracking enabled.
- Rate limits enabled.
- Mapbox token restrictions reviewed.

