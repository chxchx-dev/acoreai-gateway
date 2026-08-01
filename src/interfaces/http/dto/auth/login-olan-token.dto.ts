import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginOlanTokenDto {
  @IsString()
  @MinLength(1)
  identificacion!: string;

  @IsString()
  @MinLength(1)
  olanToken!: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  deviceName?: string;

  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
