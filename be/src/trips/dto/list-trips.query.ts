import { IsIn, IsOptional, IsString } from 'class-validator';

export class ListTripsQuery {
  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  sort?: string;

  @IsOptional()
  @IsIn(['draft', 'planned'])
  status?: 'draft' | 'planned';
}
