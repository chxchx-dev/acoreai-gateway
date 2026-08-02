import { Injectable } from '@nestjs/common';
import { DeviceService } from 'src/modules/auth/device.service';
import { UserDeviceRepositoryPort } from 'src/application/ports/user-device-repository.port';
import { DeviceMeta } from 'src/domain/auth/device-meta';

@Injectable()
export class UserDeviceRepositoryAdapter implements UserDeviceRepositoryPort {
  constructor(private readonly deviceService: DeviceService) {}

  claim(
    userId: string,
    deviceId: string,
    meta?: DeviceMeta,
    force?: boolean,
  ): Promise<{ ok: true }> {
    return this.deviceService.claim(userId, deviceId, meta, force);
  }

  assertDevice(userId: string, deviceId?: string): Promise<void> {
    return this.deviceService.assertDevice(userId, deviceId);
  }

  release(userId: string, deviceId: string): Promise<{ released: boolean }> {
    return this.deviceService.release(userId, deviceId);
  }
}
