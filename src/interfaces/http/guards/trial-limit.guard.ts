import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Request } from 'express';
import { TrialService } from 'src/modules/trial/trial.service';

const TRIAL_LIMIT = 3;

export interface TrialRequest extends Request {
  trialFingerprint?: string;
  trialQuestionsUsed?: number;
}

@Injectable()
export class TrialLimitGuard implements CanActivate {
  constructor(private readonly trialService: TrialService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<TrialRequest>();
    const fingerprint = this.buildFingerprint(req);
    req.trialFingerprint = fingerprint;

    const { count, allowed } = await this.trialService.checkAndIncrement(fingerprint);

    if (!allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Trial limit reached',
          message:
            'Has alcanzado el límite de 3 preguntas de prueba. Regístrate para seguir hablando con Alania sin límites.',
          limitReached: true,
          questionsUsed: count,
          maxQuestions: TRIAL_LIMIT,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    req.trialQuestionsUsed = count;
    return true;
  }

  private buildFingerprint(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'] as string | undefined;
    const ip = forwarded?.split(',')[0]?.trim() ?? req.ip ?? 'unknown';
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    const acceptLanguage = req.headers['accept-language'] ?? 'unknown';

    return createHash('sha256')
      .update(`${ip}|${userAgent}|${acceptLanguage}`)
      .digest('hex');
  }
}
