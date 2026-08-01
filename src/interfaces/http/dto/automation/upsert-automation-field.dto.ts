import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min, MaxLength } from 'class-validator';

const FIELD_TYPES = ['select', 'text', 'textarea', 'date', 'time', 'number', 'file'] as const;

export class UpsertAutomationFieldDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  key!: string;

  @IsString()
  @IsIn(FIELD_TYPES)
  tipo!: (typeof FIELD_TYPES)[number];

  @IsOptional()
  @IsBoolean()
  requerido?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxCaracteres?: number;

  @IsOptional()
  opciones?: unknown;

  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;
}
