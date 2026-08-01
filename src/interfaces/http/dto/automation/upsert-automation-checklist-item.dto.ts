import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min, MaxLength } from 'class-validator';

export class UpsertAutomationChecklistItemDto {
  @IsString()
  @IsIn(['antes', 'despues'])
  momento!: 'antes' | 'despues';

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  label!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;
}
