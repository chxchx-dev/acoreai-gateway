import { IsNotEmpty, IsObject, IsString, MaxLength } from 'class-validator';

export class UpsertAutomationRuleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  categoria!: string;

  @IsObject()
  reglas!: Record<string, unknown>;
}
