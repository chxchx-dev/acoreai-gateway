import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { AuthService } from 'src/modules/auth/auth.service';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { UserRole } from 'src/domain/auth/user-role';
import { createTestApp } from './test-app';

describe('Auth smoke', () => {
  let app: INestApplication;
  let authService: AuthService;
  let prisma: PrismaService;
  const email = 'smoke-auth@test.local';
  const password = 'Sm0keTest!Password';

  beforeAll(async () => {
    app = await createTestApp();
    authService = app.get(AuthService);
    prisma = app.get(PrismaService);

    await prisma.authSession.deleteMany({ where: { user: { email } } });
    await prisma.user.deleteMany({ where: { email } });
    await authService.createUser(email, password, 'Smoke Test User', UserRole.FREE);
  });

  afterAll(async () => {
    await prisma.authSession.deleteMany({ where: { user: { email } } });
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('logs in with valid credentials and issues tokens', async () => {
    const tokens = await authService.login(email, password);

    expect(tokens.accessToken).toEqual(expect.any(String));
    expect(tokens.refreshToken).toEqual(expect.any(String));
    expect(tokens.user.email).toBe(email);

    const payload = await authService.verifyToken(tokens.accessToken);
    expect(payload?.email).toBe(email);
  });

  it('rejects login with a wrong password', async () => {
    await expect(authService.login(email, 'wrong-password')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects login for a non-existent user', async () => {
    await expect(
      authService.login('no-existe@test.local', 'whatever-password'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
