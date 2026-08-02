import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/infrastructure/database/prisma/prisma.module';
import { MailModule } from 'src/infrastructure/mail/mail.module';
import { AuthController } from 'src/interfaces/http/controllers/auth.controller';
import { DeviceController } from 'src/interfaces/http/controllers/device.controller';
import { AuthService } from './auth.service';
import { DeviceService } from './device.service';
import { UserDeviceRepositoryAdapter } from 'src/infrastructure/database/prisma/user-device-repository.adapter';
import { USER_DEVICE_REPOSITORY_PORT } from 'src/application/ports/user-device-repository.port';
import { UserRepositoryAdapter } from 'src/infrastructure/database/prisma/user.repository.adapter';
import { USER_REPOSITORY_PORT } from 'src/application/ports/user-repository.port';
import { AuthSessionRepositoryAdapter } from 'src/infrastructure/database/prisma/auth-session.repository.adapter';
import { AUTH_SESSION_REPOSITORY_PORT } from 'src/application/ports/auth-session-repository.port';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<number>('JWT_ACCESS_TTL_SECONDS', 900),
          issuer: config.getOrThrow<string>('JWT_ISSUER'),
          audience: config.getOrThrow<string>('JWT_AUDIENCE'),
        },
        verifyOptions: {
          issuer: config.getOrThrow<string>('JWT_ISSUER'),
          audience: config.getOrThrow<string>('JWT_AUDIENCE'),
        },
      }),
    }),
  ],
  controllers: [AuthController, DeviceController],
  providers: [
    AuthService,
    DeviceService,
    UserDeviceRepositoryAdapter,
    { provide: USER_DEVICE_REPOSITORY_PORT, useExisting: UserDeviceRepositoryAdapter },
    UserRepositoryAdapter,
    { provide: USER_REPOSITORY_PORT, useExisting: UserRepositoryAdapter },
    AuthSessionRepositoryAdapter,
    { provide: AUTH_SESSION_REPOSITORY_PORT, useExisting: AuthSessionRepositoryAdapter },
  ],
  exports: [AuthService, DeviceService, USER_DEVICE_REPOSITORY_PORT],
})
export class AuthModule {}
