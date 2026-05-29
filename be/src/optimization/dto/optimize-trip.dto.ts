import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PlaceInputDto } from '../../trips/dto/add-trip-place.dto';
import type { TravelProfile } from '../../trips/types/trip.types';

export class OptimizeTripDto {
  @IsOptional()
  @IsIn(['driving', 'walking', 'cycling'])
  profile?: TravelProfile;

  @IsOptional()
  @IsString()
  startTripPlaceId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PlaceInputDto)
  startPoint?: PlaceInputDto;

  @IsOptional()
  @IsBoolean()
  returnToStart?: boolean;

  @IsOptional()
  @IsBoolean()
  respectLockedPlaces?: boolean;
}

export class GenerateRouteDto extends OptimizeTripDto {
  @IsOptional()
  @IsString({ each: true })
  orderedTripPlaceIds?: string[];
}
