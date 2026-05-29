import { Module } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export const DATABASE = Symbol('DATABASE');

@Module({
  providers: [
    {
      provide: DATABASE,
      useFactory: () => {
        const databaseUrl = process.env.DATABASE_URL;

        if (!databaseUrl) {
          return null;
        }

        const client = postgres(databaseUrl, { max: 5 });
        return drizzle(client, { schema });
      },
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule {}
