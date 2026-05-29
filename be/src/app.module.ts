import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { OptimizationModule } from './optimization/optimization.module';
import { PlacesModule } from './places/places.module';
import { TripsModule } from './trips/trips.module';

@Module({
  imports: [
    DatabaseModule,
    HealthModule,
    AuthModule,
    TripsModule,
    PlacesModule,
    OptimizationModule,
  ],
})
export class AppModule {}
