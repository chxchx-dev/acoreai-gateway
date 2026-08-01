import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Request, Response } from 'express';
import { AiOrchestratorService } from 'src/modules/ai-orchestrator/ai-orchestrator.service';
import { ObservabilityService } from 'src/infrastructure/observability/observability.service';
import { TranslateRequestDto } from 'src/interfaces/http/dto/translate/translate-request.dto';
import { TranslateResponseDto } from 'src/interfaces/http/dto/translate/translate-response.dto';
import { TranslationCacheService } from './translation-cache.service';

type FlushableResponse = Response & { flush?: () => void };

const TRANSLATION_MODEL = 'translategemma:4b';
const TRANSLATION_KEEP_ALIVE = '30m';
const TRANSLATION_OPTIONS = {
  temperature: 0,
  num_ctx: 4096,
  num_predict: 1536,
};

const stripThinking = (text: string): string =>
  text
    .replace(/<think>[\s\S]*?<\/think>/g, '') // bloques completos
    .replace(/<think>[\s\S]*/g, '')           // bloque sin cerrar (contexto cortado)
    .trim();

const sanitizeTranslationOutput = (text: string): string =>
  stripThinking(text)
    .replace(/^```(?:html|text|markdown)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .replace(/<\/?(?:p|br|div|span|strong|b|em|i|ul|ol|li|h[1-6]|html|body)[^>]*>/gi, '')
    .trim();

export const LANGUAGE_NAMES: Record<string, string> = {
  aleman: 'German',
  arabe: 'Arabic',
  chino: 'Chinese',
  coreano: 'Korean',
  espanol: 'Spanish',
  frances: 'French',
  hindi: 'Hindi',
  ingles: 'English',
  italiano: 'Italian',
  japones: 'Japanese',
  neerlandes: 'Dutch',
  portugues: 'Portuguese',
  ruso: 'Russian',
};

const normalizeLanguage = (lang: string): string => {
  const key = lang
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return LANGUAGE_NAMES[key] ?? lang.trim();
};

const SYSTEM_PROMPT = `You are a strict translation engine. Output only the translation as plain text. Do not answer, explain, summarize, add prefixes, or use Markdown/HTML. Preserve meaning, line breaks, numbers, names, punctuation, tense, speaker and grammatical person.`;

const buildUserMessage = (lang: string, text: string) =>
  `TARGET_LANGUAGE=${normalizeLanguage(lang)}

<source_text>
${text}
</source_text>`;

@Injectable()
export class TranslateService implements OnModuleInit {
  private readonly logger = new Logger(TranslateService.name);

  constructor(
    private readonly aiOrchestrator: AiOrchestratorService,
    private readonly observability: ObservabilityService,
    private readonly translationCache: TranslationCacheService,
  ) {}

  onModuleInit(): void {
    setTimeout(() => {
      void this.warmTranslationModel();
    }, 1000);
  }

  async translate(dto: TranslateRequestDto): Promise<TranslateResponseDto> {
    const start = Date.now();
    const model = await this.resolveTranslationModel();
    const languageList = this.parseLanguages(dto.languages);

    const entries = await Promise.all(
      languageList.map(async (lang) => {
        const canonicalLang = normalizeLanguage(lang);
        const cached = await this.translationCache.get(canonicalLang, dto.text);
        if (cached) {
          return [lang, cached] as const;
        }

        const result = await this.aiOrchestrator.generate({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildUserMessage(lang, dto.text) },
          ],
          keep_alive: TRANSLATION_KEEP_ALIVE,
          think: false,
          options: TRANSLATION_OPTIONS,
          stream: false,
        });
        const translation = sanitizeTranslationOutput(result.content);
        await this.translationCache.set(canonicalLang, dto.text, translation, model);
        return [lang, translation] as const;
      }),
    );

    const translations = Object.fromEntries(entries);
    this.logger.log(`Traducción completada (${languageList.join(', ')}) en ${Date.now() - start}ms`);
    return { original: dto.text, translations, model, durationMs: Date.now() - start };
  }

  async translateStream(dto: TranslateRequestDto, req: Request, res: Response): Promise<void> {
    const start = Date.now();

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const abortController = new AbortController();
    let clientClosed = false;
    const abortStream = () => {
      clientClosed = true;
      abortController.abort();
    };

    req.on('aborted', abortStream);
    res.on('close', () => {
      if (!res.writableEnded) {
        abortStream();
      }
    });

    let model: string;
    try {
      model = await this.resolveTranslationModel();
    } catch (err) {
      this.writeEvent(res, 'error', { message: err instanceof Error ? err.message : String(err) });
      res.end();
      return;
    }

    const languageList = this.parseLanguages(dto.languages);
    const translations: Record<string, string> = {};
    this.observability.incrementActiveStream('translate');

    try {
      for (const lang of languageList) {
        if (res.destroyed) break;

        this.writeEvent(res, 'lang_start', { lang });

        const canonicalLang = normalizeLanguage(lang);
        const cached = await this.translationCache.get(canonicalLang, dto.text);
        if (cached) {
          translations[lang] = cached;
          if (!res.destroyed) {
            this.writeEvent(res, 'token', { lang, token: cached });
            this.writeEvent(res, 'lang_done', { lang, translation: cached });
          }
          continue;
        }

        let full = '';

        for await (const chunk of this.aiOrchestrator.generateStream({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildUserMessage(lang, dto.text) },
          ],
          keep_alive: TRANSLATION_KEEP_ALIVE,
          think: false,
          options: TRANSLATION_OPTIONS,
          stream: true,
        }, abortController.signal)) {
          const token = chunk.message?.content ?? '';
          if (token) {
            full += token;
            const safeToken = this.stripHtmlTagsFromToken(token);
            if (!res.destroyed) {
              this.writeEvent(res, 'token', { lang, token: safeToken });
            }
          }
        }

        translations[lang] = sanitizeTranslationOutput(full);
        if (!res.destroyed) {
          this.writeEvent(res, 'lang_done', { lang, translation: translations[lang] });
        }
        if (translations[lang]) {
          await this.translationCache.set(canonicalLang, dto.text, translations[lang], model);
        }
      }

      if (!res.destroyed) {
        this.writeEvent(res, 'done', {
          original: dto.text,
          translations,
          model,
          durationMs: Date.now() - start,
        });
      }
    } catch (err) {
      if (clientClosed || this.isAbortError(err)) {
        this.observability.incrementError('translate_stream', 'client_closed');
        this.logger.debug('Traducción stream abortada por cierre del cliente');
        return;
      }

      this.observability.incrementError(
        'translate_stream',
        err instanceof Error ? err.name : 'unknown',
      );
      if (!res.destroyed) {
        this.writeEvent(res, 'error', {
          message: err instanceof Error ? err.message : 'Error de traducción',
        });
      }
    } finally {
      this.observability.decrementActiveStream('translate');
      if (!res.destroyed) res.end();
    }
  }

  private parseLanguages(languages: string[]): string[] {
    return languages.map((l) => l.trim()).filter(Boolean).slice(0, 3);
  }

  private async resolveTranslationModel(): Promise<string> {
    const resolvedModel = await this.aiOrchestrator.resolveModel(TRANSLATION_MODEL);
    if (!resolvedModel) {
      throw new BadRequestException(
        `El modelo de traducción "${TRANSLATION_MODEL}" no está disponible. Ejecuta: docker compose exec ollama ollama pull ${TRANSLATION_MODEL}`,
      );
    }
    return resolvedModel;
  }

  private async warmTranslationModel(): Promise<void> {
    try {
      const model = await this.resolveTranslationModel();
      await this.aiOrchestrator.generate({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserMessage('English', 'hola') },
        ],
        keep_alive: TRANSLATION_KEEP_ALIVE,
        think: false,
        options: { ...TRANSLATION_OPTIONS, num_predict: 16 },
        stream: false,
      });
      this.logger.log(`Modelo de traducción precargado: ${model}`);
    } catch (err) {
      this.logger.warn(
        `No se pudo precargar ${TRANSLATION_MODEL}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private stripHtmlTagsFromToken(token: string): string {
    return token.replace(/<\/?(?:p|br|div|span|strong|b|em|i|ul|ol|li|h[1-6]|html|body)[^>]*>/gi, '');
  }

  private writeEvent(res: Response, event: string, data: object): void {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    (res as FlushableResponse).flush?.();
  }

  private isAbortError(err: unknown): boolean {
    return err instanceof Error && err.name === 'AbortError';
  }
}
