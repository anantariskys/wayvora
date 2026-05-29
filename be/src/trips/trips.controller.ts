import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/types/auth.types';
import { AddTripPlaceDto } from './dto/add-trip-place.dto';
import { CreateTripDto } from './dto/create-trip.dto';
import { ListTripsQuery } from './dto/list-trips.query';
import { ReorderTripPlacesDto } from './dto/reorder-trip-places.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { TripsService } from './trips.service';

@UseGuards(AuthGuard)
@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTripDto) {
    return this.tripsService.create(user, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ListTripsQuery) {
    return this.tripsService.list(user, query);
  }

  @Get(':tripId')
  detail(@CurrentUser() user: AuthUser, @Param('tripId') tripId: string) {
    return this.tripsService.findForUser(user, tripId);
  }

  @Patch(':tripId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('tripId') tripId: string,
    @Body() dto: UpdateTripDto,
  ) {
    return this.tripsService.update(user, tripId, dto);
  }

  @Delete(':tripId')
  @HttpCode(204)
  delete(@CurrentUser() user: AuthUser, @Param('tripId') tripId: string) {
    this.tripsService.delete(user, tripId);
  }

  @Post(':tripId/places')
  addPlace(
    @CurrentUser() user: AuthUser,
    @Param('tripId') tripId: string,
    @Body() dto: AddTripPlaceDto,
  ) {
    return this.tripsService.addPlace(user, tripId, dto);
  }

  @Patch(':tripId/places/reorder')
  reorderPlaces(
    @CurrentUser() user: AuthUser,
    @Param('tripId') tripId: string,
    @Body() dto: ReorderTripPlacesDto,
  ) {
    return this.tripsService.reorderPlaces(user, tripId, dto);
  }
}
