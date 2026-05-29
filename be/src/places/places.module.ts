import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MapboxModule } from '../mapbox/mapbox.module';
import { PlacesController } from './places.controller';
import { PlacesService } from './places.service';

@Module({
  imports: [AuthModule, MapboxModule],
  controllers: [PlacesController],
  providers: [PlacesService],
})
export class PlacesModule {}
