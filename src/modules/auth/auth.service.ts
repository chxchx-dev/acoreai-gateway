import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import * as argon2 from 'argon2';
import { randomBytes, randomInt, randomUUID } from 'crypto';
import { MailService } from 'src/infrastructure/mail/mail.service';
import { UserRole } from 'src/domain/auth/user-role';
import { KnowledgeRole } from 'src/domain/knowledge/knowledge-role';
import {
  USER_REPOSITORY_PORT,
  UserRepositoryPort,
} from 'src/application/ports/user-repository.port';
import {
  AUTH_SESSION_REPOSITORY_PORT,
  AuthSessionRepositoryPort,
} from 'src/application/ports/auth-session-repository.port';
export { UserRole } from 'src/domain/auth/user-role';
export { KnowledgeRole } from 'src/domain/knowledge/knowledge-role';

export interface JwtPayload {
  sub:   string;
  email: string;
  name:  string;
  role:  UserRole;
  knowledgeRole?: KnowledgeRole | null;
  /** Id de la AuthSession que respalda este access token. Tokens emitidos
   *  antes de agregar el bloqueo de sesión única no lo tienen. */
  sid?:  string;
  iat?:  number;
  exp?:  number;
  iss?:  string;
  aud?:  string | string[];
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  knowledgeRole?: KnowledgeRole | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  token: string;
  user: AuthUser;
}

export interface AuthRequestContext {
  userId?: string;
  role?: UserRole;
  authenticated: boolean;
}

export interface SessionDeviceInfo {
  deviceId?: string;
  deviceName?: string;
  platform?: string;
}

const ACCOUNT_SESSION_ACTIVE_MESSAGE =
  'Tu cuenta ya tiene una sesión activa en otro dispositivo.';

interface SeedUser {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

const DEFAULT_SEED_USERS: SeedUser[] = [
  {
    email: 'user1@example.com',
    password: 'CHANGE_ME_PR_1',
    name: 'Programador 10',
    role: UserRole.ACADEMIC,
  },
  {
    email: 'user2@example.com',
    password: 'CHANGE_ME_PR_2',
    name: 'Programador 11',
    role: UserRole.ACADEMIC,
  },
  {
    email: 'user3@example.com',
    password: 'CHANGE_ME_PR_3',
    name: 'Programador 12',
    role: UserRole.ACADEMIC,
  },
  {
    email: 'user4@example.com',
    password: 'CHANGE_ME_CO_1',
    name: 'Comercial 1',
    role: UserRole.ACADEMIC,
  },
];

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly users: UserRepositoryPort,
    @Inject(AUTH_SESSION_REPOSITORY_PORT)
    private readonly sessions: AuthSessionRepositoryPort,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}

  async onModuleInit() {
    await this.seedAdmin();
    await this.seedDefaultUsers();
  }

  // ── Password ───────────────────────────────────────────────────────────────

  hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });
  }

  async verifyPassword(password: string, stored: string): Promise<boolean> {
    try {
      return await argon2.verify(stored, password);
    } catch {
      return false;
    }
  }

  // ── JWT ────────────────────────────────────────────────────────────────────

  signToken(payload: Omit<JwtPayload, 'iat' | 'exp' | 'iss' | 'aud'>): Promise<string> {
    return this.jwt.signAsync(payload);
  }

  async verifyToken(token: string): Promise<JwtPayload | null> {
    try {
      return await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      return null;
    }
  }

  async verifyBearerHeader(authorization?: string | string[]): Promise<JwtPayload | null> {
    const header = Array.isArray(authorization) ? authorization[0] : authorization;
    if (!header) {
      return null;
    }

    if (!header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Formato de Authorization inválido');
    }

    const payload = await this.verifyToken(header.slice(7));
    if (!payload) {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    if (payload.sid) {
      const session = await this.sessions.findById(payload.sid);
      if (!session || session.revokedAt || session.expiresAt <= new Date()) {
        throw new UnauthorizedException('Tu sesión fue cerrada: se inició sesión en otro dispositivo');
      }
    }

    return payload;
  }

  async resolveRequestUserId(
    request: Request,
    trustedBackendUserId?: string,
  ): Promise<string | undefined> {
    return (await this.resolveRequestContext(request, trustedBackendUserId)).userId;
  }

  async resolveRequestContext(
    request: Request,
    trustedBackendUserId?: string,
  ): Promise<AuthRequestContext> {
    const jwtUser = await this.verifyBearerHeader(request.headers['authorization']);
    if (jwtUser) {
      return {
        userId: jwtUser.sub,
        role: jwtUser.role,
        authenticated: true,
      };
    }

    return {
      userId: trustedBackendUserId,
      authenticated: false,
    };
  }

  private async issueTokens(user: AuthUser, device?: SessionDeviceInfo): Promise<AuthTokens> {
    const { refreshToken, sessionId } = await this.createRefreshSession(user.id, device);
    const accessToken = await this.signToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      knowledgeRole: user.knowledgeRole ?? null,
      sid: sessionId,
    });

    return {
      accessToken,
      refreshToken,
      token: accessToken,
      user,
    };
  }

  /**
   * Si la cuenta ya tiene otra sesión activa en un dispositivo distinto,
   * bloquea el login con 409 (a menos que `force`, en cuyo caso cierra todas
   * las sesiones activas para dejar solo la nueva).
   */
  private async assertNoOtherActiveSession(
    userId: string,
    deviceId?: string,
    force?: boolean,
  ): Promise<void> {
    const active = await this.sessions.findActiveByUserId(userId);

    if (!active) return;
    if (deviceId && active.deviceId === deviceId) return;

    if (!force) {
      throw new ConflictException({
        code: 'ACCOUNT_SESSION_ACTIVE',
        message: ACCOUNT_SESSION_ACTIVE_MESSAGE,
        activeDevice: {
          deviceName: active.deviceName ?? null,
          platform: active.platform ?? null,
          since: active.createdAt,
        },
      });
    }

    await this.sessions.revokeAllForUser(userId);
  }

  private async createRefreshSession(
    userId: string,
    device?: SessionDeviceInfo,
  ): Promise<{ refreshToken: string; sessionId: string }> {
    const sessionId = randomUUID();
    const refreshSecret = randomBytes(48).toString('base64url');
    const refreshToken = `${sessionId}.${refreshSecret}`;
    const refreshTokenHash = await this.hashPassword(refreshSecret);
    const ttlSeconds = this.config.get<number>('JWT_REFRESH_TTL_SECONDS', 2592000);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await this.sessions.create({
      id: sessionId,
      userId,
      refreshTokenHash,
      expiresAt,
      deviceId: device?.deviceId,
      deviceName: device?.deviceName,
      platform: device?.platform,
    });

    return { refreshToken, sessionId };
  }

  async refreshSession(refreshToken: string): Promise<AuthTokens> {
    const session = await this.findValidRefreshSession(refreshToken);
    if (!session) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    await this.sessions.revoke(session.id);
    return this.issueTokens(session.user, {
      deviceId: session.deviceId ?? undefined,
      deviceName: session.deviceName ?? undefined,
      platform: session.platform ?? undefined,
    });
  }

  async revokeRefreshToken(refreshToken: string): Promise<{ revoked: true }> {
    const session = await this.findValidRefreshSession(refreshToken);
    if (session) {
      await this.sessions.revoke(session.id);
    }

    return { revoked: true };
  }

  private async findValidRefreshSession(
    refreshToken: string,
  ): Promise<{ id: string; refreshTokenHash: string; revokedAt: Date | null; expiresAt: Date; deviceId: string | null; deviceName: string | null; platform: string | null; user: AuthUser } | null> {
    const [sessionId, refreshSecret] = refreshToken.split('.');
    if (!sessionId || !refreshSecret) {
      return null;
    }

    const session = await this.sessions.findByIdWithUser(sessionId);

    if (!session || !session.user || session.revokedAt || session.expiresAt <= new Date()) {
      return null;
    }

    if (await this.verifyPassword(refreshSecret, session.refreshTokenHash)) {
      return { ...session, user: session.user };
    }

    return null;
  }

  // ── Auth ───────────────────────────────────────────────────────────────────

  async login(
    email: string,
    password: string,
    device?: SessionDeviceInfo,
    force?: boolean,
  ): Promise<AuthTokens> {
    const user = await this.users.findByEmail(email.trim().toLowerCase());

    if (!user || !(await this.verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      knowledgeRole: user.knowledgeRole ?? null,
    };
    await this.assertNoOtherActiveSession(authUser.id, device?.deviceId, force);
    return this.issueTokens(authUser, device);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ changed: true }> {
    const user = await this.users.findById(userId);
    if (!user || !(await this.verifyPassword(currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('La contraseña actual no es correcta');
    }

    await this.users.updatePasswordById(userId, await this.hashPassword(newPassword));

    return { changed: true };
  }

  // ── Recuperación de contraseña ──────────────────────────────────────────────

  /**
   * Genera un código de 6 dígitos y lo envía por correo. Responde siempre
   * { sent: true } exista o no el correo, para no revelar qué cuentas están
   * registradas (evita enumeración de usuarios).
   */
  async forgotPassword(email: string): Promise<{ sent: true }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.users.findByEmail(normalizedEmail);

    if (user) {
      const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
      const ttlMinutes = this.config.get<number>('PASSWORD_RESET_TTL_MINUTES', 15);
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

      await this.users.setResetToken(normalizedEmail, await this.hashPassword(code), expiresAt);

      try {
        await this.mail.sendPasswordResetCode(normalizedEmail, code, ttlMinutes);
      } catch (err) {
        this.logger.error(`No se pudo enviar el correo de recuperación a ${normalizedEmail}: ${err}`);
      }
    } else {
      this.logger.log(`Solicitud de recuperación para correo no registrado: ${normalizedEmail}`);
    }

    return { sent: true };
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<{ reset: true }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.users.findByEmail(normalizedEmail);

    if (
      !user ||
      !user.resetTokenHash ||
      !user.resetTokenExpiresAt ||
      user.resetTokenExpiresAt <= new Date() ||
      !(await this.verifyPassword(code, user.resetTokenHash))
    ) {
      throw new UnauthorizedException('El código es inválido o ya venció');
    }

    await this.users.updatePasswordByEmail(normalizedEmail, await this.hashPassword(newPassword));

    // Cierra las sesiones activas: si alguien más tenía el refresh token, queda invalidado.
    await this.sessions.revokeAllForUser(user.id);

    return { reset: true };
  }

  async createUser(
    email: string,
    password: string,
    name: string,
    role: UserRole = UserRole.FREE,
    knowledgeRole?: KnowledgeRole,
  ): Promise<{ id: string; email: string; name: string; role: UserRole; knowledgeRole: KnowledgeRole | null; createdAt: Date }> {
    const normalizedEmail = email.trim().toLowerCase();
    const exists = await this.users.findByEmail(normalizedEmail);
    if (exists) throw new ConflictException('El correo ya está registrado');

    const user = await this.users.create({
      email: normalizedEmail,
      passwordHash: await this.hashPassword(password),
      name,
      role,
      knowledgeRole: knowledgeRole ?? null,
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      knowledgeRole: user.knowledgeRole,
      createdAt: user.createdAt,
    };
  }

  async findById(id: string): Promise<{ id: string; email: string; name: string; role: UserRole } | null> {
    const user = await this.users.findById(id);
    if (!user) return null;

    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  async listUsers(): Promise<
    { id: string; email: string; name: string; role: UserRole; knowledgeRole: KnowledgeRole | null; createdAt: Date }[]
  > {
    const users = await this.users.findMany();
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      knowledgeRole: user.knowledgeRole,
      createdAt: user.createdAt,
    }));
  }

  async setKnowledgeRole(
    userId: string,
    knowledgeRole: KnowledgeRole | null,
  ): Promise<{ id: string; email: string; name: string; role: UserRole; knowledgeRole: KnowledgeRole | null }> {
    const user = await this.users.updateKnowledgeRole(userId, knowledgeRole);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      knowledgeRole: user.knowledgeRole,
    };
  }

  // ── Seed ───────────────────────────────────────────────────────────────────

  private async seedAdmin(): Promise<void> {
    const adminEmail = this.config.get<string>('ADMIN_EMAIL')?.trim().toLowerCase();
    const adminPassword = this.config.get<string>('ADMIN_PASSWORD');
    const adminName = this.config.get<string>('ADMIN_NAME')?.trim();

    if (!adminEmail || !adminPassword || !adminName) {
      this.logger.log('ADMIN_EMAIL/ADMIN_PASSWORD/ADMIN_NAME no configurados; seed admin omitido');
      return;
    }

    try {
      const existing = await this.users.findByEmail(adminEmail);
      if (!existing) {
        await this.createUser(adminEmail, adminPassword, adminName, UserRole.ADMIN);
        this.logger.log(`Admin sembrado: ${adminEmail}`);
        return;
      }

      await this.users.updateProfileByEmail(adminEmail, {
        passwordHash: await this.hashPassword(adminPassword),
        name: adminName,
        role: UserRole.ADMIN,
      });
      this.logger.log(`Admin sincronizado desde entorno: ${adminEmail}`);
    } catch (err) {
      this.logger.warn(`Seed admin falló (¿prisma migrate pendiente?): ${err}`);
    }
  }

  private async seedDefaultUsers(): Promise<void> {
    for (const user of DEFAULT_SEED_USERS) {
      await this.seedUser(user);
    }
  }

  private async seedUser(user: SeedUser): Promise<void> {
    const email = user.email.trim().toLowerCase();

    try {
      const existing = await this.users.findByEmail(email);

      if (!existing) {
        await this.createUser(email, user.password, user.name, user.role);
        this.logger.log(`Usuario por defecto sembrado: ${email}`);
        return;
      }

      await this.users.updateProfileByEmail(email, {
        passwordHash: await this.hashPassword(user.password),
        name: user.name,
        role: user.role,
      });
      this.logger.log(`Usuario por defecto sincronizado: ${email}`);
    } catch (err) {
      this.logger.warn(`Seed de usuario por defecto falló (${email}): ${err}`);
    }
  }
}
