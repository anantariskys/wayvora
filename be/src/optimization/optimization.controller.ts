import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/types/auth.types';
import { GenerateRouteDto, OptimizeTripDto } from './dto/optimize-trip.dto';
import { OptimizationService } from './optimization.service';

@UseGuards(AuthGuard)
@Controller('trips/:tripId')
export class OptimizationController {
  constructor(private readonly optimizationService: OptimizationService) {}

  @Post('optimize')
  optimizeTrip(
    @CurrentUser() user: AuthUser,
    @Param('tripId') tripId: string,
    @Body() dto: OptimizeTripDto,
  ) {
    return this.optimizationService.optimizeTrip(user, tripId, dto);
  }

  @Post('routes/generate')
  generateRoute(
    @CurrentUser() user: AuthUser,
    @Param('tripId') tripId: string,
    @Body() dto: GenerateRouteDto,
  ) {
    return this.optimizationService.generateRoute(user, tripId, dto);
  }
}
