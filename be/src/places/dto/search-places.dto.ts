import { IsOptional, IsString } from 'class-validator';

export class SearchPlacesQuery {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  proximity?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
