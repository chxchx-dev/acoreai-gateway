import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAutomationProcessDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  role?: string;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredInputs?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  optionalInputs?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  restrictions?: string[];
}
