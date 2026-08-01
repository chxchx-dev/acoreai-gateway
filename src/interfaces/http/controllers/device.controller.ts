import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { DeviceService } from 'src/modules/auth/device.service';
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
  constructor(private readonly deviceService: DeviceService) {}

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
