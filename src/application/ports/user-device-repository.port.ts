import { DeviceMeta } from 'src/domain/auth/device-meta';

export const USER_DEVICE_REPOSITORY_PORT = Symbol('USER_DEVICE_REPOSITORY_PORT');

export interface UserDeviceRepositoryPort {
  claim(
    userId: string,
    deviceId: string,
    meta?: DeviceMeta,
    force?: boolean,
  ): Promise<{ ok: true }>;
  assertDevice(userId: string, deviceId?: string): Promise<void>;
  release(userId: string, deviceId: string): Promise<{ released: boolean }>;
}
