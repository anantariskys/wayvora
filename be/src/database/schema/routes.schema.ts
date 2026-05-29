import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { trips } from './trips.schema';

export const routes = pgTable(
  'routes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    profile: text('profile').notNull().default('driving'),
    algorithm: text('algorithm').notNull(),
    orderedTripPlaceIds: uuid('ordered_trip_place_ids').array().notNull(),
    totalDistanceMeters: integer('total_distance_meters').notNull(),
    totalDurationSeconds: integer('total_duration_seconds').notNull(),
    geometry: jsonb('geometry'),
    encodedPolyline: text('encoded_polyline'),
    matrixCacheKey: text('matrix_cache_key'),
    optimizationMetadata: jsonb('optimization_metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('routes_trip_created_idx').on(table.tripId, table.createdAt),
  ],
);

export const cachedDistanceMatrices = pgTable(
  'cached_distance_matrices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cacheKey: text('cache_key').notNull().unique(),
    profile: text('profile').notNull(),
    coordinateHash: text('coordinate_hash').notNull(),
    provider: text('provider').notNull().default('mapbox'),
    matrix: jsonb('matrix').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('cached_distance_matrices_lookup_idx').on(
      table.profile,
      table.coordinateHash,
    ),
    index('cached_distance_matrices_expiry_idx').on(table.expiresAt),
  ],
);
