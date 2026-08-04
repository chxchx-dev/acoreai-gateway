import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { AddressInfo } from 'net';
import { AppModule } from 'src/app.module';
import { configureHttpApp } from 'src/app/configure-http';
import { AuthService } from 'src/modules/auth/auth.service';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { UserRole } from 'src/domain/auth/user-role';
import { LLM_PORT } from 'src/application/ports/llm.port';
import { createFakeLlmPort } from '../smoke/test-app';

jest.setTimeout(60000);

interface HttpResult {
  status: number;
  body: unknown;
}

async function requestJson(
  baseUrl: string,
  path: string,
  options: { method?: string; token?: string; body?: Record<string, unknown> } = {},
): Promise<HttpResult> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();

  let body: unknown = text;
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    // Keep non-JSON responses available in the assertion output.
  }

  return { status: response.status, body };
}

describe('Core HTTP E2E demo', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;
  let baseUrl: string;
  let userId: string;
  let conversationId: string | undefined;

  const email = `e2e-${randomUUID()}@test.local`;
  const password = 'E2eDemo!Password';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(LLM_PORT)
      .useValue(createFakeLlmPort())
      .compile();

    app = moduleRef.createNestApplication({ bodyParser: false });
    configureHttpApp(app);
    await app.listen(0, '127.0.0.1');

    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
    prisma = app.get(PrismaService);
    authService = app.get(AuthService);

    const user = await authService.createUser(email, password, 'E2E Demo User', UserRole.FREE);
    userId = user.id;
  });

  afterAll(async () => {
    if (conversationId) {
      await prisma.aiChatLog.deleteMany({ where: { conversationId } });
      await prisma.aiConversationMessage.deleteMany({ where: { conversationId } });
      await prisma.aiConversation.deleteMany({ where: { id: conversationId } });
    }
    await prisma.authSession.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await app.close();
  });

  it('logs in, calls protected chat over HTTP, persists the conversation, and logs out', async () => {
    const login = await requestJson(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: { email, password, deviceName: 'E2E Demo', platform: 'test' },
    });
    expect(login.status).toBe(201);

    const tokens = login.body as { accessToken: string; refreshToken: string; user: { id: string } };
    expect(tokens.accessToken).toEqual(expect.any(String));
    expect(tokens.refreshToken).toEqual(expect.any(String));
    expect(tokens.user.id).toBe(userId);

    const me = await requestJson(baseUrl, '/api/auth/me', { token: tokens.accessToken });
    expect(me.status).toBe(200);
    expect((me.body as { email: string }).email).toBe(email);

    const chat = await requestJson(baseUrl, '/api/chat', {
      method: 'POST',
      token: tokens.accessToken,
      body: {
        question: '¿Qué demuestra este flujo?',
        source: 'e2e-demo',
        model: 'llama3.2:1b',
        useRag: false,
        useHistory: false,
      },
    });
    expect(chat.status).toBe(201);

    const chatBody = chat.body as { status: string; answer: string; conversationId: string };
    expect(chatBody.status).toBe('answered');
    expect(chatBody.answer).toBe('Respuesta de prueba');
    expect(chatBody.conversationId).toEqual(expect.any(String));
    conversationId = chatBody.conversationId;

    const messages = await requestJson(
      baseUrl,
      `/api/conversations/${conversationId}/messages`,
      { token: tokens.accessToken },
    );
    expect(messages.status).toBe(200);
    const messageBody = messages.body as { items: Array<{ role: string }>; total: number };
    expect(messageBody.total).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(messageBody.items)).toBe(true);
    expect(messageBody.items.map((message) => message.role)).toEqual(
      expect.arrayContaining(['user', 'assistant']),
    );

    const logout = await requestJson(baseUrl, '/api/auth/logout', {
      method: 'POST',
      body: { refreshToken: tokens.refreshToken },
    });
    expect(logout.status).toBe(201);

    const afterLogout = await requestJson(baseUrl, '/api/auth/me', { token: tokens.accessToken });
    expect(afterLogout.status).toBe(401);
  });
});
