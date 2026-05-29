import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MapboxModule } from '../mapbox/mapbox.module';
import { TripsModule } from '../trips/trips.module';
import { DistanceMatrixService } from './distance-matrix.service';
import { NearestNeighborStrategy } from './nearest-neighbor.strategy';
import { OptimizationController } from './optimization.controller';
import { OptimizationService } from './optimization.service';

@Module({
  imports: [AuthModule, TripsModule, MapboxModule],
  controllers: [OptimizationController],
  providers: [
    DistanceMatrixService,
    NearestNeighborStrategy,
    OptimizationService,
  ],
})
export class OptimizationModule {}
