import { INestApplication } from '@nestjs/common';
import { ChatService } from 'src/application/services/chat/chat.service';
import { ConversationsService } from 'src/modules/conversations/conversations.service';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { createTestApp } from './test-app';

describe('Chat smoke (non-RAG path, LLM_PORT sustituido por un fake)', () => {
  let app: INestApplication;
  let chatService: ChatService;
  let conversationsService: ConversationsService;
  let prisma: PrismaService;
  let conversationId: string;

  beforeAll(async () => {
    app = await createTestApp();
    chatService = app.get(ChatService);
    conversationsService = app.get(ConversationsService);
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (conversationId) {
      await prisma.aiConversationMessage.deleteMany({ where: { conversationId } });
      await prisma.aiConversation.deleteMany({ where: { id: conversationId } });
    }
    await app.close();
  });

  it('answers a direct question without RAG and persists the conversation', async () => {
    const response = await chatService.ask({
      question: 'Hola, ¿cómo estás?',
      model: 'smoke-test-model',
      source: 'smoke-test',
      useRag: false,
      useHistory: false,
    });

    expect(response.status).toBe('answered');
    expect(response.answer).toBe('Respuesta de prueba');
    expect(response.conversationId).toEqual(expect.any(String));

    conversationId = response.conversationId!;

    const messages = await conversationsService.getRecentMessages(conversationId, 10);
    expect(messages.some((m) => m.role === 'user')).toBe(true);
    expect(messages.some((m) => m.role === 'assistant')).toBe(true);
  });
});
