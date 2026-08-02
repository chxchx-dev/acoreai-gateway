import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { AuthSessionRepositoryPort } from 'src/application/ports/auth-session-repository.port';
import { AuthSessionRecord, CreateAuthSessionData } from 'src/domain/auth/auth-session-record';

@Injectable()
export class AuthSessionRepositoryAdapter implements AuthSessionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAuthSessionData): Promise<void> {
    await this.prisma.authSession.create({
      data: {
        id: data.id,
        userId: data.userId,
        refreshTokenHash: data.refreshTokenHash,
        expiresAt: data.expiresAt,
        deviceId: data.deviceId,
        deviceName: data.deviceName,
        platform: data.platform,
      },
    });
  }

  async findById(id: string): Promise<AuthSessionRecord | null> {
    return this.prisma.authSession.findUnique({ where: { id } }) as Promise<AuthSessionRecord | null>;
  }

  async findByIdWithUser(id: string): Promise<AuthSessionRecord | null> {
    return this.prisma.authSession.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, name: true, role: true } },
      },
    }) as unknown as Promise<AuthSessionRecord | null>;
  }

  async findActiveByUserId(userId: string): Promise<AuthSessionRecord | null> {
    return this.prisma.authSession.findFirst({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    }) as Promise<AuthSessionRecord | null>;
  }

  async revoke(id: string): Promise<void> {
    await this.prisma.authSession.update({ where: { id }, data: { revokedAt: new Date() } });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
