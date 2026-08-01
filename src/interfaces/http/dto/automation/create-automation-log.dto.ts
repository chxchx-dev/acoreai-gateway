import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateAutomationLogDto {
  @IsOptional()
  @IsString()
  @IsIn(['pending', 'success', 'error'])
  status?: 'pending' | 'success' | 'error';

  @IsObject()
  inputPayload!: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  outputSummary?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  errorMessage?: string;
}
