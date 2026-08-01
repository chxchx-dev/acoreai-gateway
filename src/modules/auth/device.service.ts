import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';

const DEVICE_IN_USE_MESSAGE =
  'Tu cuenta está siendo usada en otro dispositivo. Cierra sesión ahí para continuar aquí.';

export interface DeviceMeta {
  deviceName?: string;
  platform?: string;
}

@Injectable()
export class DeviceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Si `force` es true y la cuenta ya está reclamada por otro dispositivo,
   * le quita el reclamo a ese dispositivo y lo deja en el actual (igual que
   * el `force` de assertNoOtherActiveSession en AuthService, pero para la
   * vía de "userId de confianza" que usa la app móvil).
   */
  async claim(userId: string, deviceId: string, meta: DeviceMeta = {}, force?: boolean) {
    const existing = await this.prisma.userDevice.findUnique({ where: { userId } });

    if (!existing) {
      await this.prisma.userDevice.create({
        data: { userId, deviceId, deviceName: meta.deviceName, platform: meta.platform },
      });
      return { ok: true as const };
    }

    if (existing.deviceId !== deviceId) {
      if (!force) {
        throw new ConflictException({
          code: 'DEVICE_IN_USE',
          message: DEVICE_IN_USE_MESSAGE,
          activeDevice: {
            deviceName: existing.deviceName ?? null,
            platform: existing.platform ?? null,
            since: existing.claimedAt,
          },
        });
      }

      await this.prisma.userDevice.update({
        where: { userId },
        data: {
          deviceId,
          deviceName: meta.deviceName,
          platform: meta.platform,
          claimedAt: new Date(),
        },
      });
      return { ok: true as const };
    }

    await this.prisma.userDevice.update({
      where: { userId },
      data: { deviceName: meta.deviceName, platform: meta.platform },
    });
    return { ok: true as const };
  }

  async assertDevice(userId: string, deviceId?: string): Promise<void> {
    const existing = await this.prisma.userDevice.findUnique({ where: { userId } });
    if (!existing) return;

    if (!deviceId || existing.deviceId !== deviceId) {
      throw new ConflictException(DEVICE_IN_USE_MESSAGE);
    }
  }

  async release(userId: string, deviceId: string): Promise<{ released: boolean }> {
    const existing = await this.prisma.userDevice.findUnique({ where: { userId } });
    if (!existing || existing.deviceId !== deviceId) {
      return { released: false };
    }

    await this.prisma.userDevice.delete({ where: { userId } });
    return { released: true };
  }
}
