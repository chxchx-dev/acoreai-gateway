import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { AiOrchestratorService } from 'src/modules/ai-orchestrator/ai-orchestrator.service';
import { PromptBuilderService } from 'src/application/services/prompt-builder.service';
import {
  CONVERSATION_REPOSITORY_PORT,
  ConversationRepositoryPort,
} from 'src/application/ports/conversation-repository.port';
import {
  CHAT_LOG_REPOSITORY_PORT,
  ChatLogRepositoryPort,
} from 'src/application/ports/chat-log-repository.port';
import { ObservabilityService } from 'src/infrastructure/observability/observability.service';
import { RagContextResult, RagService } from 'src/modules/rag/rag.service';
import { IntentClassifierService } from './intent-classifier.service';
import {
  ChatOptions,
  ChatRequest,
  ChatResponse,
  ChatSource,
} from 'src/application/contracts/chat.contract';
import {
  EDUCATIONAL_SYSTEM_PROMPT,
  EDUCATIONAL_SYSTEM_PROMPT_WITH_CONTEXT,
} from './prompts/educational-system.prompt';
import {
  RESEARCH_PERSPECTIVES,
  PerspectiveDefinition,
} from './prompts/perspectives.prompt';
import { createThinkingStreamFilter, stripThinking } from './utils/strip-thinking';

type FlushableResponse = Response & { flush?: () => void };

interface ChatConversationContext {
  conversationId: string;
  userMessageId: string;
  summaryBlock: string;
  historyBlock: string;
  historyUsed: number;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly aiOrchestrator: AiOrchestratorService,
    private readonly ragService: RagService,
    @Inject(CONVERSATION_REPOSITORY_PORT)
    private readonly conversationsService: ConversationRepositoryPort,
    @Inject(CHAT_LOG_REPOSITORY_PORT)
    private readonly logsService: ChatLogRepositoryPort,
    private readonly config: ConfigService,
    private readonly observability: ObservabilityService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly intentClassifier: IntentClassifierService,
  ) {}

  // No hay clasificador de intención real: dto.useRag es un flag opcional del
  // cliente. Si lo manda explícito, se respeta (override manual/debug). Si no,
  // el sistema decide por sí mismo si la pregunta necesita RAG.
  private async resolveUseRag(dto: ChatRequest): Promise<boolean> {
    if (typeof dto.useRag === 'boolean') return dto.useRag;
    return this.intentClassifier.classify(dto.question);
  }

  async ask(dto: ChatRequest): Promise<ChatResponse> {
    const start = Date.now();
    const model = await this.resolveModel(dto);
    const maxChars = this.config.get<number>('MAX_QUESTION_CHARS', 1000);

    if (dto.question.length > maxChars) {
      return {
        answer: null,
        model,
        durationMs: 0,
        status: 'error',
        sources: [],
        error: `La pregunta supera el límite de ${maxChars} caracteres.`,
      };
    }

    const conversation = await this.prepareConversationContext(dto);

    if (await this.resolveUseRag(dto)) {
      return this.askWithRag(dto, start, model, conversation);
    }
    return this.askDirect(dto, start, model, conversation);
  }

  async stream(dto: ChatRequest, req: Request, response: Response): Promise<void> {
    const start = Date.now();
    const maxChars = this.config.get<number>('MAX_QUESTION_CHARS', 1000);

    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders?.();

    let model: string;
    try {
      model = await this.resolveModel(dto);
    } catch (err: unknown) {
      this.writeStreamEvent(response, 'error', {
        message: this.resolvePublicErrorMessage(err),
      });
      response.end();
      return;
    }

    if (dto.question.length > maxChars) {
      this.writeStreamEvent(response, 'error', {
        message: `La pregunta supera el límite de ${maxChars} caracteres.`,
      });
      response.end();
      return;
    }

    let conversation: ChatConversationContext;
    let prepared: Awaited<ReturnType<typeof this.prepareChat>>;

    try {
      conversation = await this.prepareConversationContext(dto);
      prepared = await this.prepareChat(dto, model, conversation);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error preparando chat stream: ${message}`);
      this.writeStreamEvent(response, 'error', {
        message: 'No se pudo preparar la conversacion.',
      });
      response.end();
      return;
    }

    if (prepared.status === 'no_context') {
      const chatResponse: ChatResponse = {
        answer: prepared.answer ?? null,
        model,
        durationMs: Date.now() - start,
        status: 'no_context',
        sources: [],
        conversationId: conversation.conversationId,
        historyUsed: conversation.historyUsed,
      };
      chatResponse.messageId = await this.saveAssistantMessage(
        conversation.conversationId,
        chatResponse,
        'no_context',
      );
      await this.createChatLog(dto, chatResponse, 0);

      this.writeStreamEvent(response, 'done', chatResponse);
      response.end();
      return;
    }

    let answer = '';
    const abortController = new AbortController();
    let clientClosed = false;

    const abortStream = () => {
      clientClosed = true;
      abortController.abort();
    };

    req.on('aborted', abortStream);
    response.on('close', () => {
      if (!response.writableEnded) {
        abortStream();
      }
    });

    this.observability.incrementActiveStream('chat');

    try {
      const filterThinking = createThinkingStreamFilter();
      for await (const chunk of this.aiOrchestrator.generateStream({
        model,
        messages: [
          { role: 'system', content: prepared.systemPrompt },
          { role: 'user', content: dto.question },
        ],
        keep_alive: dto.keepAlive,
        think: false,
        options: this.buildOllamaOptions(dto.options),
        stream: true,
      }, abortController.signal)) {
        // Filtro defensivo: algunos modelos ignoran think:false y emiten su
        // razonamiento crudo (casi siempre en inglés) envuelto en
        // <think>...</think> dentro del propio content.
        const token = filterThinking(chunk.message?.content ?? '');
        if (token) {
          answer += token;
          if (!response.destroyed) {
            this.writeStreamEvent(response, 'token', { token });
          }
        }
      }

      // Stream complete — save to history regardless of client state
      const sources = prepared.sources ?? [];
      const chatResponse: ChatResponse = {
        answer,
        model,
        durationMs: Date.now() - start,
        status: 'answered',
        sources,
        conversationId: conversation.conversationId,
        historyUsed: conversation.historyUsed,
      };

      chatResponse.messageId = await this.saveAssistantMessage(
        conversation.conversationId,
        chatResponse,
        'saved',
        prepared.chunksUsed ?? 0,
        sources,
      );
      await this.createChatLog(
        dto,
        chatResponse,
        prepared.chunksUsed ?? 0,
        sources,
      );
      this.queueConversationSummary(conversation.conversationId, model, dto.mode, dto.practiceLanguage);

      if (!response.destroyed) {
        this.writeStreamEvent(response, 'done', chatResponse);
      }
    } catch (err: unknown) {
      if (clientClosed || this.isAbortError(err)) {
        this.observability.incrementError('chat_stream', 'client_closed');
        this.logger.debug(
          `Chat stream abortado por cierre del cliente: ${conversation.conversationId}`,
        );
        return;
      }

      const errorResponse = await this.buildErrorResponse(
        dto,
        err,
        start,
        model,
        conversation,
      );
      if (!response.destroyed) {
        this.writeStreamEvent(response, 'error', {
          message: errorResponse.error,
          conversationId: errorResponse.conversationId,
        });
      }
    } finally {
      this.observability.decrementActiveStream('chat');
      if (!response.destroyed) {
        response.end();
      }
    }
  }

  async streamPerspectives(dto: ChatRequest, req: Request, response: Response): Promise<void> {
    const start = Date.now();
    const maxChars = this.config.get<number>('MAX_QUESTION_CHARS', 1000);

    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders?.();

    let model: string;
    try {
      model = await this.resolveModel(dto);
    } catch (err: unknown) {
      this.writeStreamEvent(response, 'error', { message: this.resolvePublicErrorMessage(err) });
      response.end();
      return;
    }

    if (dto.question.length > maxChars) {
      this.writeStreamEvent(response, 'error', {
        message: `La pregunta supera el límite de ${maxChars} caracteres.`,
      });
      response.end();
      return;
    }

    let conversation: ChatConversationContext;
    try {
      conversation = await this.prepareConversationContext(dto);
    } catch (err: unknown) {
      this.writeStreamEvent(response, 'error', { message: 'No se pudo preparar la conversación.' });
      response.end();
      return;
    }

    // Optional RAG search for sources/bibliography
    let sources: ChatSource[] = [];
    let ragContextText = '';
    if (await this.resolveUseRag(dto)) {
      try {
        const ragResult = await this.ragService.searchContext(dto.question);
        sources = ragResult.chunks.map((c) => ({
          documentId: c.documentId,
          chunkId: c.chunkId,
          title: c.title,
          chunkIndex: c.chunkIndex,
          score: Math.round(c.score * 1000) / 1000,
          sourceUrl: c.sourceUrl,
        }));
        ragContextText = ragResult.contextText;
      } catch {
        // RAG failure is non-fatal for perspectives
      }
    }

    const abortController = new AbortController();
    let clientClosed = false;

    const abortStream = () => {
      clientClosed = true;
      abortController.abort();
    };
    req.on('aborted', abortStream);
    response.on('close', () => { if (!response.writableEnded) abortStream(); });

    this.observability.incrementActiveStream('perspectives');

    const perspectiveTexts: string[] = [];

    try {
      for (const [idx, perspective] of RESEARCH_PERSPECTIVES.entries()) {
        if (clientClosed) break;

        this.writeStreamEvent(response, 'perspective_start', {
          index: idx,
          label: perspective.label,
          icon: perspective.icon,
          color: perspective.color,
        });

        const systemPrompt = this.buildPerspectivePrompt(
          perspective,
          ragContextText,
          conversation,
          dto,
        );

        let perspText = '';
        const perspOptions = {
          ...this.buildOllamaOptions(dto.options),
          num_predict: 900,
          num_ctx: 8192,
        };
        const filterThinking = createThinkingStreamFilter();
        for await (const chunk of this.aiOrchestrator.generateStream({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: dto.question },
          ],
          keep_alive: dto.keepAlive,
          think: false,
          options: perspOptions,
          stream: true,
        }, abortController.signal)) {
          if (clientClosed) break;
          const token = filterThinking(chunk.message?.content ?? '');
          if (token) {
            perspText += token;
            if (!response.destroyed) {
              this.writeStreamEvent(response, 'perspective_token', {
                perspectiveIndex: idx,
                token,
              });
            }
          }
        }
        this.logger.log(`Perspectiva ${idx} generada: ${perspText.length} chars`);

        perspectiveTexts.push(perspText);

        if (!response.destroyed) {
          this.writeStreamEvent(response, 'perspective_done', {
            index: idx,
            label: perspective.label,
            icon: perspective.icon,
            color: perspective.color,
            text: perspText,
            sources,
          });
        }
      }

      // Save combined assistant message to conversation
      const combinedAnswer = RESEARCH_PERSPECTIVES
        .map((p, i) => `[${p.label}]\n${perspectiveTexts[i] ?? ''}`)
        .join('\n\n---\n\n');

      const chatResponse: ChatResponse = {
        answer: combinedAnswer,
        model,
        durationMs: Date.now() - start,
        status: 'answered',
        sources,
        conversationId: conversation.conversationId,
        historyUsed: conversation.historyUsed,
      };

      chatResponse.messageId = await this.saveAssistantMessage(
        conversation.conversationId,
        chatResponse,
        'saved',
        sources.length,
        sources,
      );
      await this.createChatLog(dto, chatResponse, sources.length, sources);
      this.queueConversationSummary(conversation.conversationId, model, dto.mode, dto.practiceLanguage);

      if (!response.destroyed) {
        this.writeStreamEvent(response, 'done', {
          perspectives: RESEARCH_PERSPECTIVES.map((p, i) => ({
            index: i,
            key: p.key,
            label: p.label,
            icon: p.icon,
            color: p.color,
            text: perspectiveTexts[i] ?? '',
            sources,
          })),
          sources,
          conversationId: conversation.conversationId,
          messageId: chatResponse.messageId,
          model,
          durationMs: chatResponse.durationMs,
        });
      }
    } catch (err: unknown) {
      if (clientClosed || this.isAbortError(err)) {
        this.observability.incrementError('perspectives_stream', 'client_closed');
        // Save whatever perspectives completed before the disconnect
        try {
          if (perspectiveTexts.some((t) => t.length > 0)) {
            const partialAnswer = RESEARCH_PERSPECTIVES
              .map((p, i) => perspectiveTexts[i] ? `[${p.label}]\n${perspectiveTexts[i]}` : '')
              .filter(Boolean)
              .join('\n\n---\n\n');
            await this.saveAssistantMessage(
              conversation.conversationId,
              {
                answer: partialAnswer,
                model,
                durationMs: Date.now() - start,
                status: 'answered',
                sources,
                conversationId: conversation.conversationId,
              },
              'saved',
              sources.length,
              sources,
            );
          }
        } catch (saveErr: unknown) {
          const saveMessage = saveErr instanceof Error ? saveErr.message : String(saveErr);
          this.logger.warn(`No se pudo guardar respuesta parcial de perspectivas: ${saveMessage}`);
        }
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error en streamPerspectives: ${message}`);
      if (!response.destroyed) {
        this.writeStreamEvent(response, 'error', { message: 'Error generando perspectivas.' });
      }
    } finally {
      this.observability.decrementActiveStream('perspectives');
      if (!response.destroyed) response.end();
    }
  }

  private buildPerspectivePrompt(
    perspective: PerspectiveDefinition,
    ragContextText: string,
    conversation: ChatConversationContext,
    dto: ChatRequest,
  ): string {
    const basePrompt = ragContextText
      ? `${perspective.systemPrompt}\n\nCONTEXTO DE REFERENCIA:\n${ragContextText}`
      : perspective.systemPrompt;

    return this.promptBuilder.withConversationHistory({
      basePrompt,
      summaryBlock: conversation.summaryBlock,
      historyBlock: '',
      customSystem: dto.system,
    });
  }

  private isAbortError(err: unknown): boolean {
    if (!(err instanceof Error)) return false;
    const message = err.message.toLowerCase();
    return err.name === 'AbortError' || message.includes('abort') || message.includes('aborted');
  }

  private async askDirect(
    dto: ChatRequest,
    start: number,
    model: string,
    conversation: ChatConversationContext,
  ): Promise<ChatResponse> {
    try {
      const result = await this.aiOrchestrator.generate({
        model,
        messages: [
          {
            role: 'system',
            content: this.promptBuilder.withConversationHistory({
              basePrompt: EDUCATIONAL_SYSTEM_PROMPT,
              summaryBlock: conversation.summaryBlock,
              historyBlock: conversation.historyBlock,
              customSystem: dto.system,
            }),
          },
          { role: 'user', content: dto.question },
        ],
        keep_alive: dto.keepAlive,
        think: false,
        options: this.buildOllamaOptions(dto.options),
        stream: false,
      });

      const response: ChatResponse = {
        answer: stripThinking(result.content),
        model,
        durationMs: Date.now() - start,
        status: 'answered',
        sources: [],
        conversationId: conversation.conversationId,
        historyUsed: conversation.historyUsed,
      };

      response.messageId = await this.saveAssistantMessage(
        conversation.conversationId,
        response,
        'saved',
      );
      await this.createChatLog(dto, response, 0);
      this.queueConversationSummary(conversation.conversationId, model, dto.mode, dto.practiceLanguage);

      return response;
    } catch (err: unknown) {
      return this.buildErrorResponse(dto, err, start, model, conversation);
    }
  }

  private async askWithRag(
    dto: ChatRequest,
    start: number,
    model: string,
    conversation: ChatConversationContext,
  ): Promise<ChatResponse> {
    let ragResult: RagContextResult;

    try {
      ragResult = await this.ragService.searchContext(dto.question);
    } catch (err: unknown) {
      this.logger.warn(
        `RAG search falló, respondiendo con el modelo general: ${err instanceof Error ? err.message : String(err)}`,
      );
      return this.askDirect(dto, start, model, conversation);
    }

    if (ragResult.chunks.length === 0) {
      this.logger.debug(
        'RAG sin resultados en la base de conocimiento, respondiendo con el modelo general',
      );
      return this.askDirect(dto, start, model, conversation);
    }

    const systemPrompt = EDUCATIONAL_SYSTEM_PROMPT_WITH_CONTEXT.replace(
      '{{context}}',
      ragResult.contextText,
    );

    try {
      const result = await this.aiOrchestrator.generate({
        model,
        messages: [
          {
            role: 'system',
            content: this.promptBuilder.withConversationHistory({
              basePrompt: systemPrompt,
              summaryBlock: conversation.summaryBlock,
              historyBlock: conversation.historyBlock,
              customSystem: dto.system,
            }),
          },
          { role: 'user', content: dto.question },
        ],
        keep_alive: dto.keepAlive,
        think: false,
        options: this.buildOllamaOptions(dto.options),
        stream: false,
      });

      const sources: ChatSource[] = ragResult.chunks.map((c) => ({
        documentId: c.documentId,
        chunkId: c.chunkId,
        title: c.title,
        chunkIndex: c.chunkIndex,
        score: Math.round(c.score * 1000) / 1000,
        sourceUrl: c.sourceUrl,
      }));

      const response: ChatResponse = {
        answer: stripThinking(result.content),
        model,
        durationMs: Date.now() - start,
        status: 'answered',
        sources,
        conversationId: conversation.conversationId,
        historyUsed: conversation.historyUsed,
      };

      response.messageId = await this.saveAssistantMessage(
        conversation.conversationId,
        response,
        'saved',
        ragResult.chunks.length,
        sources,
      );
      await this.createChatLog(dto, response, ragResult.chunks.length, sources);
      this.queueConversationSummary(conversation.conversationId, model, dto.mode, dto.practiceLanguage);

      return response;
    } catch (err: unknown) {
      return this.buildErrorResponse(dto, err, start, model, conversation);
    }
  }

  private async buildErrorResponse(
    dto: ChatRequest,
    err: unknown,
    start: number,
    model: string,
    conversation?: ChatConversationContext,
  ): Promise<ChatResponse> {
    const durationMs = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    const isTimeout = message.includes('timeout') || message.includes('Timeout');

    this.logger.error(`Error en chat (${durationMs}ms): ${message}`);
    this.observability.incrementError('chat', isTimeout ? 'timeout' : 'model_error');

    const response: ChatResponse = {
      answer: null,
      model,
      durationMs,
      status: 'error',
      sources: [],
      conversationId: conversation?.conversationId,
      historyUsed: conversation?.historyUsed,
      error: isTimeout
        ? 'El modelo local no respondió a tiempo.'
        : 'No se pudo obtener respuesta del modelo.',
    };

    if (conversation) {
      response.messageId = await this.saveAssistantMessage(
        conversation.conversationId,
        response,
        'error',
        0,
        undefined,
        response.error,
      );
    }

    await this.createChatLog(dto, response, 0);

    return response;
  }

  private async resolveModel(dto: ChatRequest): Promise<string> {
    const model = dto.model?.trim();

    if (!model) {
      throw new BadRequestException(
        'Debes enviar el campo "model" con uno de los modelos disponibles en /api/ollama/models.',
      );
    }

    const resolvedModel = await this.aiOrchestrator.resolveModel(model);

    if (!resolvedModel) {
      throw new BadRequestException(
        `El modelo "${model}" no está disponible en Ollama. Consulta /api/ollama/models.`,
      );
    }

    return resolvedModel;
  }

  private async prepareConversationContext(
    dto: ChatRequest,
  ): Promise<ChatConversationContext> {
    const conversation = await this.conversationsService.resolveConversation({
      conversationId: dto.conversationId,
      userId: dto.userId,
      source: dto.source,
    });

    const useHistory = dto.useHistory ?? true;
    const historyLimit = this.conversationsService.resolveHistoryLimit(
      dto.historyLimit,
    );
    const messages = useHistory
      ? await this.conversationsService.getRecentMessages(
          conversation.id,
          historyLimit,
        )
      : [];
    const historyBlock = this.conversationsService.buildHistoryBlock(messages);
    const userMessage = await this.conversationsService.appendMessage({
      conversationId: conversation.id,
      role: 'user',
      content: dto.question,
    });

    return {
      conversationId: conversation.id,
      userMessageId: userMessage.id,
      summaryBlock: conversation.summary ?? '',
      historyBlock,
      historyUsed: messages.filter((message) => message.status !== 'error').length,
    };
  }

  private async prepareChat(
    dto: ChatRequest,
    model: string,
    conversation: ChatConversationContext,
  ): Promise<{
    status: 'ready' | 'no_context';
    systemPrompt: string;
    answer?: string;
    sources?: ChatSource[];
    chunksUsed?: number;
  }> {
    const generalPrompt = () => {
      // En modo 'practice' (o voz retomando una práctica: mode:'voice' +
      // practiceLanguage) dto.system ya viene resuelto por ChatPolicy con el
      // prompt del idioma/nivel elegido (p. ej. "Respond ONLY in French").
      // Si se concatena detrás de EDUCATIONAL_SYSTEM_PROMPT ("Responde en
      // español claro") el modelo termina ignorando el idioma pedido y
      // respondiendo en inglés/español por defecto — por eso aquí el prompt
      // de práctica reemplaza la base en vez de solo añadirse al final.
      const isPractice = (dto.mode === 'practice' || !!dto.practiceLanguage) && !!dto.system;
      return {
        status: 'ready' as const,
        systemPrompt: this.promptBuilder.withConversationHistory({
          basePrompt: isPractice ? dto.system! : EDUCATIONAL_SYSTEM_PROMPT,
          summaryBlock: conversation.summaryBlock,
          historyBlock: conversation.historyBlock,
          customSystem: isPractice ? undefined : dto.system,
        }),
      };
    };

    if (!(await this.resolveUseRag(dto))) {
      return generalPrompt();
    }

    let ragResult: RagContextResult;
    try {
      ragResult = await this.ragService.searchContext(dto.question);
    } catch (err: unknown) {
      this.logger.warn(
        `RAG search falló, respondiendo con el modelo general: ${err instanceof Error ? err.message : String(err)}`,
      );
      return generalPrompt();
    }

    if (ragResult.chunks.length === 0) {
      this.logger.debug(
        'RAG sin resultados en la base de conocimiento, respondiendo con el modelo general',
      );
      return generalPrompt();
    }

    const systemPrompt = EDUCATIONAL_SYSTEM_PROMPT_WITH_CONTEXT.replace(
      '{{context}}',
      ragResult.contextText,
    );
    const sources: ChatSource[] = ragResult.chunks.map((c) => ({
      documentId: c.documentId,
      chunkId: c.chunkId,
      title: c.title,
      chunkIndex: c.chunkIndex,
      score: Math.round(c.score * 1000) / 1000,
      sourceUrl: c.sourceUrl,
    }));

    return {
      status: 'ready',
      systemPrompt: this.promptBuilder.withConversationHistory({
        basePrompt: systemPrompt,
        summaryBlock: conversation.summaryBlock,
        historyBlock: conversation.historyBlock,
        customSystem: dto.system,
      }),
      sources,
      chunksUsed: ragResult.chunks.length,
    };
  }

  private queueConversationSummary(
    conversationId: string,
    model: string,
    mode?: ChatRequest['mode'],
    practiceLanguage?: string,
  ): void {
    // El resumen (refreshConversationSummary) siempre se redacta en español
    // sin importar el idioma de la conversación, y se vuelve a inyectar como
    // contexto en el siguiente turno. En práctica de idiomas eso mete un
    // bloque de español justo al lado de "Respond ONLY in <idioma>", y el
    // modelo termina mezclando español e inglés. La práctica no necesita
    // continuidad de resumen entre turnos, así que simplemente se omite —
    // incluye el modo de voz retomando una práctica (mode:'voice' +
    // practiceLanguage), no solo mode:'practice'.
    if (mode === 'practice' || practiceLanguage) return;
    void this.refreshConversationSummary(conversationId, model).catch(
      (err: unknown) => {
        this.logger.warn(
          `No se pudo actualizar resumen de conversacion: ${err instanceof Error ? err.message : String(err)}`,
        );
      },
    );
  }

  private async refreshConversationSummary(
    conversationId: string,
    model: string,
  ): Promise<void> {
    const work = await this.conversationsService.getSummaryWork(conversationId);
    if (!work) {
      return;
    }

    const transcript = work.messages
      .map((message) => {
        const role = message.role === 'user' ? 'Usuario' : 'Asistente';
        return `${role}: ${message.content}`;
      })
      .join('\n\n');
    const previousSummary = work.currentSummary?.trim()
      ? `Resumen previo existente:\n${work.currentSummary}\n\n`
      : '';
    const result = await this.aiOrchestrator.generate({
      model,
      messages: [
        {
          role: 'system',
          content: [
            'Resume esta conversacion para mantener continuidad futura.',
            '',
            'Reglas:',
            '- Conserva datos que el usuario haya dado sobre si mismo.',
            '- Conserva objetivos, preferencias y acuerdos.',
            '- Conserva dudas pendientes.',
            '- No inventes.',
            '- No agregues contenido educativo no mencionado.',
            '- No incluyas fuentes documentales ni metadata tecnica.',
            '- Escribe maximo 1800 caracteres.',
          ].join('\n'),
        },
        {
          role: 'user',
          content: `${previousSummary}Mensajes nuevos a resumir:\n${transcript}`,
        },
      ],
      options: {
        temperature: 0.1,
        num_predict: 700,
      },
      stream: false,
    });

    await this.conversationsService.saveSummary(
      conversationId,
      result.content,
      work.summarizeUpToCount,
    );
  }

  private resolvePublicErrorMessage(err: unknown): string {
    if (err instanceof HttpException && err.getStatus() < HttpStatus.INTERNAL_SERVER_ERROR) {
      const exceptionResponse = err.getResponse();
      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'message' in exceptionResponse
      ) {
        const message = (exceptionResponse as { message: unknown }).message;
        return Array.isArray(message) ? message.join(', ') : String(message);
      }

      return err.message;
    }

    return 'No se pudo preparar la conversacion.';
  }

  private buildOllamaOptions(
    options?: ChatOptions,
  ): Record<string, boolean | number | string> | undefined {
    if (!options) {
      return undefined;
    }

    const entries = Object.entries(options).filter(([, value]) => value !== undefined);
    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  }

  private writeStreamEvent(
    response: Response,
    event: string,
    data: object,
  ): void {
    response.write(`event: ${event}\n`);
    response.write(`data: ${JSON.stringify(data)}\n\n`);
    (response as FlushableResponse).flush?.();
  }

  private async saveAssistantMessage(
    conversationId: string,
    res: ChatResponse,
    status: 'saved' | 'error' | 'no_context',
    chunksUsed = 0,
    sources?: ChatSource[],
    errorMessage?: string,
  ): Promise<string | undefined> {
    try {
      const message = await this.conversationsService.appendMessage({
        conversationId,
        role: 'assistant',
        content: res.answer ?? errorMessage ?? '',
        model: res.model,
        status,
        errorMessage,
        chunksUsed,
        sources,
      });
      return message.id;
    } catch (err: unknown) {
      this.logger.error(
        `Error guardando mensaje de conversación: ${err instanceof Error ? err.message : String(err)}`,
      );
      return undefined;
    }
  }

  private async createChatLog(
    dto: ChatRequest,
    response: ChatResponse,
    chunksUsed: number,
    sources?: ChatSource[],
  ): Promise<void> {
    try {
      await this.logsService.create({
        userId: dto.userId,
        conversationId: response.conversationId,
        source: dto.source,
        question: dto.question,
        answer: response.answer,
        model: response.model,
        status: response.status,
        errorMessage: response.error,
        durationMs: response.durationMs,
        chunksUsed,
        sources,
      });
    } catch (err: unknown) {
      this.logger.warn(
        `No se pudo persistir chat log en MongoDB: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

}
