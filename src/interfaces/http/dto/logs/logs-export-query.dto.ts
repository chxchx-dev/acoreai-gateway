import { IsIn, IsISO8601, IsOptional, IsString } from 'class-validator';

export class LogsExportQueryDto {
  @IsIn(['csv', 'xlsx'])
  format!: 'csv' | 'xlsx';

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}
