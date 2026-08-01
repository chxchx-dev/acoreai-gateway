import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginOlanDto {
  @IsString()
  @MinLength(1)
  identificacion!: string;

  @IsString()
  @MinLength(1)
  password!: string;

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
