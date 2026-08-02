import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { AiOrchestratorService } from 'src/modules/ai-orchestrator/ai-orchestrator.service';
import {
  CHAT_LOG_REPOSITORY_PORT,
  ChatLogRepositoryPort,
} from 'src/application/ports/chat-log-repository.port';
import { KnowledgeSearchService } from './knowledge-search.service';
import { buildRagSystemPrompt } from './prompt.util';
import { KnowledgeAuditService } from '../knowledge-audit.service';

export interface ChatRagResult {
  answer: string;
  sources: { title: string; page: number | null; section: string | null; score: number }[];
  usedKnowledge: boolean;
}

const NO_CONTEXT_ANSWER =
  'No tengo información suficiente en la base de conocimiento aprobada para responder eso.';

@Injectable()
export class KnowledgeChatService {
  constructor(
    private readonly search: KnowledgeSearchService,
    private readonly aiOrchestrator: AiOrchestratorService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: KnowledgeAuditService,
    @Inject(CHAT_LOG_REPOSITORY_PORT)
    private readonly logs: ChatLogRepositoryPort,
  ) {}

  async ask(params: {
    message: string;
    area?: string;
    language?: string;
    model?: string;
    userId?: string;
  }): Promise<ChatRagResult> {
    const startedAt = Date.now();

    const results = await this.search.search({
      query: params.message,
      area: params.area,
      language: params.language,
      userId: params.userId,
    });

    if (results.length === 0) {
      await this.logs.create({
        userId: params.userId,
        source: 'rag_chat',
        question: params.message,
        answer: NO_CONTEXT_ANSWER,
        model: params.model ?? this.config.get<string>('RAG_CHAT_MODEL', ''),
        status: 'no_context',
        durationMs: Date.now() - startedAt,
        chunksUsed: 0,
      });

      return { answer: NO_CONTEXT_ANSWER, sources: [], usedKnowledge: false };
    }

    const model = params.model ?? this.config.get<string>('RAG_CHAT_MODEL', '');
    if (!model) {
      throw new BadRequestException(
        'Debes enviar el campo "model" o configurar RAG_CHAT_MODEL con un modelo disponible en Ollama.',
      );
    }

    const resolvedModel = await this.aiOrchestrator.resolveModel(model);
    if (!resolvedModel) {
      throw new BadRequestException(`El modelo "${model}" no está disponible en Ollama.`);
    }

    const contextBlocks = results.map(
      (r, i) => `[Fuente ${i + 1}: ${r.title}${r.sectionTitle ? ` — ${r.sectionTitle}` : ''}]\n${r.content}`,
    );
    const systemPrompt = buildRagSystemPrompt(contextBlocks);

    const chatResult = await this.aiOrchestrator.generate({
      model: resolvedModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: params.message },
      ],
    });

    const chatMessageId = randomUUID();
    await this.prisma.knowledgeAnswerSource.createMany({
      data: results.map((r) => ({
        chatMessageId,
        sourceId: r.sourceId,
        chunkId: r.chunkId,
        score: r.score,
        title: r.title,
        pageStart: r.pageStart,
        pageEnd: r.pageEnd,
      })),
    });

    await this.audit.log({
      entityType: 'chat_message',
      entityId: chatMessageId,
      action: 'chat.answered',
      newValue: {
        question: params.message,
        model: resolvedModel,
        sourcesUsed: results.map((r) => r.sourceId),
        usedKnowledge: true,
      },
      userId: params.userId,
    });

    const sourcesForLog = results.map((r) => ({
      title: r.title,
      sourceId: r.sourceId,
      chunkId: r.chunkId,
      score: r.score,
    }));

    await this.logs.create({
      userId: params.userId,
      source: 'rag_chat',
      question: params.message,
      answer: chatResult.content,
      model: resolvedModel,
      status: 'answered',
      durationMs: Date.now() - startedAt,
      chunksUsed: results.length,
      sources: sourcesForLog,
    });

    return {
      answer: chatResult.content,
      sources: results.map((r) => ({
        title: r.title,
        page: r.pageStart,
        section: r.sectionTitle,
        score: Number(r.score.toFixed(4)),
      })),
      usedKnowledge: true,
    };
  }
}
