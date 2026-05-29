import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PlaceInputDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsIn(['mapbox', 'osm', 'maplibre'])
  provider!: 'mapbox' | 'osm' | 'maplibre';

  @IsString()
  @MaxLength(240)
  providerPlaceId!: string;

  @IsString()
  @MaxLength(240)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address = '';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city = '';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  country = '';

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category = 'place';
}

export class AddTripPlaceDto {
  @ValidateNested()
  @Type(() => PlaceInputDto)
  place!: PlaceInputDto;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  dayNumber?: number;
}
