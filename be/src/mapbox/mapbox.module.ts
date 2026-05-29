import { Module } from '@nestjs/common';
import { MapboxDirectionsClient } from './mapbox-directions.client';
import { MapboxMatrixClient } from './mapbox-matrix.client';
import { MapboxSearchClient } from './mapbox-search.client';

@Module({
  providers: [MapboxSearchClient, MapboxMatrixClient, MapboxDirectionsClient],
  exports: [MapboxSearchClient, MapboxMatrixClient, MapboxDirectionsClient],
})
export class MapboxModule {}
