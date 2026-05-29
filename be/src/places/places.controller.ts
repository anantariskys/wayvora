import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { SearchPlacesQuery } from './dto/search-places.dto';
import { PlacesService } from './places.service';

@UseGuards(AuthGuard)
@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get('search')
  search(@Query() query: SearchPlacesQuery) {
    return this.placesService.search(query);
  }
}
