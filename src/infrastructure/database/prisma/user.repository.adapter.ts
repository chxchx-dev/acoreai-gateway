import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { UserRepositoryPort } from 'src/application/ports/user-repository.port';
import { CreateUserData, UserRecord } from 'src/domain/auth/user-record';
import { UserRole } from 'src/domain/auth/user-role';
import { KnowledgeRole } from 'src/domain/knowledge/knowledge-role';

@Injectable()
export class UserRepositoryAdapter implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { email } }) as Promise<UserRecord | null>;
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { id } }) as Promise<UserRecord | null>;
  }

  async findMany(): Promise<UserRecord[]> {
    return this.prisma.user.findMany({ orderBy: { createdAt: 'asc' } }) as Promise<UserRecord[]>;
  }

  async create(data: CreateUserData): Promise<UserRecord> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        name: data.name,
        role: data.role,
        knowledgeRole: data.knowledgeRole ?? null,
      },
    }) as Promise<UserRecord>;
  }

  async updatePasswordById(id: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  async updatePasswordByEmail(email: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { email },
      data: { passwordHash, resetTokenHash: null, resetTokenExpiresAt: null },
    });
  }

  async setResetToken(email: string, resetTokenHash: string, resetTokenExpiresAt: Date): Promise<void> {
    await this.prisma.user.update({
      where: { email },
      data: { resetTokenHash, resetTokenExpiresAt },
    });
  }

  async updateProfileByEmail(
    email: string,
    data: { passwordHash: string; name: string; role: UserRole },
  ): Promise<void> {
    await this.prisma.user.update({ where: { email }, data });
  }

  async updateKnowledgeRole(id: string, knowledgeRole: KnowledgeRole | null): Promise<UserRecord> {
    return this.prisma.user.update({
      where: { id },
      data: { knowledgeRole },
    }) as Promise<UserRecord>;
  }
}
