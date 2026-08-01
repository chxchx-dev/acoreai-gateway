import { IsString, MinLength } from 'class-validator';

export class DeviceReleaseDto {
  @IsString()
  @MinLength(1)
  userId!: string;

  @IsString()
  @MinLength(1)
  deviceId!: string;
}
