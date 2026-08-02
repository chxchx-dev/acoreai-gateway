import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from 'src/domain/auth/user-role';
import { Platform, resolvePlatform } from 'src/domain/platform/platform';
import {
  ACOREAI_VOICE_PROMPT_BACKEND,
  PRACTICE_PROMPTS_BY_LANG,
} from 'src/application/services/chat/prompts/educational-system.prompt';

export { Platform } from 'src/domain/platform/platform';

export interface ChatPolicyOptions {
  temperature?: number;
  num_ctx?: number;
  num_predict?: number;
  top_p?: number;
  top_k?: number;
  repeat_penalty?: number;
  seed?: number;
  num_batch?: number;
  num_keep?: number;
}

export interface ChatPolicyInput {
  model?: string;
  system?: string;
  source?: string;
  platform?: Platform;
  keepAlive?: string;
  options?: ChatPolicyOptions;
  mode?: 'chat' | 'voice' | 'practice';
  practiceLevel?: string;
  practiceLanguage?: string;
}

interface ChatPolicy {
  allowedModels: string[];
  maxPredict: number;
  maxContext: number;
  maxBatch: number;
  allowCustomSystem: boolean;
  keepAlive?: string;
}

const MODEL_POLICY: Record<UserRole, ChatPolicy> = {
  // Clientes de confianza de ACoreAI — sin restricción de planes.
  [UserRole.APP]: {
    allowedModels: ['*'],
    maxPredict: 900,
    maxContext: 4096,
    maxBatch: 512,
    allowCustomSystem: true,
    keepAlive: '4h',
  },
  [UserRole.FREE]: {
    allowedModels: ['llama3.2:1b'],
    maxPredict: 300,
    maxContext: 2048,
    maxBatch: 128,
    allowCustomSystem: false,
    keepAlive: '10m',
  },
  [UserRole.ACADEMIC]: {
    allowedModels: ['llama3.2:3b', 'qwen3:4b', 'qwen3', 'acoreai'],
    maxPredict: 700,
    maxContext: 4096,
    maxBatch: 256,
    allowCustomSystem: false,
    keepAlive: '1h',
  },
  [UserRole.PLUS]: {
    allowedModels: ['llama3.2:3b', 'qwen3:4b', 'qwen3', 'acoreai'],
    maxPredict: 900,
    maxContext: 4096,
    maxBatch: 256,
    allowCustomSystem: false,
    keepAlive: '2h',
  },
  [UserRole.ADMIN]: {
    allowedModels: ['*'],
    maxPredict: 1200,
    maxContext: 4096,
    maxBatch: 512,
    allowCustomSystem: true,
    keepAlive: '4h',
  },
};

const SOURCE_ROLE_POLICY: Record<string, UserRole> = {
  'acoreai-web':   UserRole.APP,
  'acoreai-app':   UserRole.APP,
  'acoreai-mobile': UserRole.APP,
  'acoreai-voice': UserRole.APP,
  'acoreai-system':UserRole.APP,
};

export interface ChatPolicyContext {
  role?: UserRole;
  source?: string;
  platform?: Platform;
  authenticated: boolean;
}

export function applyChatPolicy(
  dto: ChatPolicyInput,
  context: ChatPolicyContext,
): ChatPolicyInput {
  const role = resolvePolicyRole(context);
  const policy = MODEL_POLICY[role];
  const requestedModel = dto.model?.trim();

  if (!requestedModel) {
    throw new BadRequestException('Debes enviar el campo "model".');
  }

  if (!isAllowedModel(requestedModel, policy.allowedModels)) {
    throw new ForbiddenException(
      `El modelo "${requestedModel}" no está permitido para la política ${role}.`,
    );
  }

  if (dto.system?.trim() && !policy.allowCustomSystem && !dto.mode) {
    throw new ForbiddenException('El system prompt personalizado no está permitido.');
  }

  // Server-trusted system prompts injected by mode — bypass allowCustomSystem
  let resolvedSystem: string | undefined = policy.allowCustomSystem ? dto.system : undefined;
  // practiceLanguage se revisa antes que mode==='voice': el modo de voz de
  // Idiomas (retomar una práctica por voz desde el historial) manda
  // mode:'voice' + practiceLanguage/practiceLevel juntos. Si se chequeara
  // 'voice' primero, siempre ganaría el prompt genérico en español
  // (ACOREAI_VOICE_PROMPT_BACKEND) e ignoraría el idioma que se practica —
  // exactamente el bug reportado ("al hablar, toma el prompt en español").
  if (dto.mode === 'practice' || dto.practiceLanguage) {
    const level = dto.practiceLevel ?? 'Principiante';
    const lang = dto.practiceLanguage ?? 'en';
    const prompts = PRACTICE_PROMPTS_BY_LANG[lang] ?? PRACTICE_PROMPTS_BY_LANG.en;
    resolvedSystem = prompts[level] ?? prompts['Principiante'];
  } else if (dto.mode === 'voice') {
    resolvedSystem = ACOREAI_VOICE_PROMPT_BACKEND;
  }

  return {
    ...dto,
    model: requestedModel,
    system: resolvedSystem,
    platform: resolvePlatform(dto.source ?? context.source),
    keepAlive: policy.keepAlive,
    options: clampOptions(dto.options, policy),
  };
}

function resolvePolicyRole(context: ChatPolicyContext): UserRole {
  if (context.authenticated && context.role) {
    return context.role;
  }

  const source = context.source?.trim();
  if (source && SOURCE_ROLE_POLICY[source]) {
    return SOURCE_ROLE_POLICY[source];
  }
  if (source?.startsWith('acoreai-practice-')) {
    return UserRole.APP;
  }

  return UserRole.FREE;
}

function isAllowedModel(requestedModel: string, allowedModels: string[]): boolean {
  if (allowedModels.includes('*')) return true;

  return allowedModels.some((allowed) => {
    if (requestedModel === allowed) {
      return true;
    }

    if (!allowed.includes(':') && requestedModel === `${allowed}:latest`) {
      return true;
    }

    if (!requestedModel.includes(':') && `${requestedModel}:latest` === allowed) {
      return true;
    }

    return false;
  });
}

function clampOptions(
  options: ChatPolicyOptions | undefined,
  policy: ChatPolicy,
): ChatPolicyOptions {
  return {
    temperature: clampNumber(options?.temperature, 0, 1, 0.4),
    top_p: clampNumber(options?.top_p, 0.1, 1, 0.9),
    top_k: clampInt(options?.top_k, 1, 80, 40),
    repeat_penalty: clampNumber(options?.repeat_penalty, 0.8, 1.4, 1.1),
    seed: options?.seed,
    num_ctx: clampInt(options?.num_ctx, 1, policy.maxContext, policy.maxContext),
    num_predict: clampInt(
      options?.num_predict,
      1,
      policy.maxPredict,
      policy.maxPredict,
    ),
    num_batch: clampInt(options?.num_batch, 1, policy.maxBatch, policy.maxBatch),
    num_keep: clampInt(options?.num_keep, 0, policy.maxContext, 0),
  };
}

function clampNumber(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(value as number, min), max);
}

function clampInt(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(Math.trunc(value as number), min), max);
}
