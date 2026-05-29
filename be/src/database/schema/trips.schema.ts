import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const trips = pgTable(
  'trips',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    startDate: date('start_date'),
    endDate: date('end_date'),
    status: text('status').notNull().default('draft'),
    visibility: text('visibility').notNull().default('private'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('trips_owner_created_idx').on(table.ownerId, table.createdAt),
  ],
);

export const places = pgTable(
  'places',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    provider: text('provider').notNull().default('mapbox'),
    providerPlaceId: text('provider_place_id'),
    name: text('name').notNull(),
    address: text('address'),
    city: text('city'),
    country: text('country'),
    latitude: numeric('latitude', { precision: 10, scale: 7 }).notNull(),
    longitude: numeric('longitude', { precision: 10, scale: 7 }).notNull(),
    category: text('category'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('places_provider_id_idx').on(table.provider, table.providerPlaceId),
    index('places_lat_lng_idx').on(table.latitude, table.longitude),
  ],
);

export const tripPlaces = pgTable(
  'trip_places',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    placeId: uuid('place_id')
      .notNull()
      .references(() => places.id, { onDelete: 'restrict' }),
    position: integer('position').notNull(),
    dayNumber: integer('day_number'),
    notes: text('notes'),
    isLocked: boolean('is_locked').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('trip_places_trip_position_idx').on(table.tripId, table.position),
    unique().on(table.tripId, table.placeId),
    unique().on(table.tripId, table.position),
  ],
);
