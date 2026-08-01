import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/infrastructure/database/prisma/prisma.module';
import { MailModule } from 'src/infrastructure/mail/mail.module';
import { AuthController } from 'src/interfaces/http/controllers/auth.controller';
import { DeviceController } from 'src/interfaces/http/controllers/device.controller';
import { AuthService } from './auth.service';
import { DeviceService } from './device.service';

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
  providers: [AuthService, DeviceService],
  exports: [AuthService, DeviceService],
})
export class AuthModule {}
