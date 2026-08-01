import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { DeviceService } from 'src/modules/auth/device.service';

/**
 * Bloquea el acceso a la IA cuando la cuenta ya está reclamada por otro
 * dispositivo. Solo aplica a la vía "userId de confianza sin JWT" que usa
 * la app móvil (ApiKeyGuard / ApiKeyOrJwtGuard sin token). Si la petición
 * viene autenticada con un JWT real (jwtUser presente) o no trae userId,
 * se deja pasar sin tocar: ese caso no forma parte de la vía que se quiere
 * limitar a un dispositivo.
 */
@Injectable()
export class DeviceLockGuard implements CanActivate {
  constructor(private readonly deviceService: DeviceService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const jwtUser = (request as unknown as Record<string, unknown>)['jwtUser'];
    if (jwtUser) return true;

    const body = request.body as Record<string, unknown> | undefined;
    const query = request.query as Record<string, unknown> | undefined;
    const userId = (query?.['userId'] ?? body?.['userId']) as string | undefined;
    if (!userId) return true;

    const deviceId = request.headers['x-device-id'];
    await this.deviceService.assertDevice(
      userId,
      Array.isArray(deviceId) ? deviceId[0] : deviceId,
    );

    return true;
  }
}
