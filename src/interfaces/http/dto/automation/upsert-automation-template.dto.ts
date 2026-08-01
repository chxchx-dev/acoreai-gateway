import { IsNotEmpty, IsObject, IsString, MaxLength } from 'class-validator';

export class UpsertAutomationTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsObject()
  payload!: Record<string, unknown>;
}
