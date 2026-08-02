import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../guards/api-key.guard';
import {
  USER_DEVICE_REPOSITORY_PORT,
  UserDeviceRepositoryPort,
} from 'src/application/ports/user-device-repository.port';
import { DeviceClaimDto } from '../dto/auth/device-claim.dto';
import { DeviceReleaseDto } from '../dto/auth/device-release.dto';

/**
 * Registro de dispositivo activo por usuario (límite de un dispositivo por
 * cuenta para el uso de la IA). Protegido solo por API key, igual que el
 * resto de endpoints mobile que confían en el userId recibido.
 */
@UseGuards(ApiKeyGuard)
@Controller('device')
export class DeviceController {
  constructor(
    @Inject(USER_DEVICE_REPOSITORY_PORT)
    private readonly deviceService: UserDeviceRepositoryPort,
  ) {}

  @Post('claim')
  claim(@Body() dto: DeviceClaimDto) {
    return this.deviceService.claim(
      dto.userId,
      dto.deviceId,
      { deviceName: dto.deviceName, platform: dto.platform },
      dto.force,
    );
  }

  @Post('release')
  release(@Body() dto: DeviceReleaseDto) {
    return this.deviceService.release(dto.userId, dto.deviceId);
  }
}
