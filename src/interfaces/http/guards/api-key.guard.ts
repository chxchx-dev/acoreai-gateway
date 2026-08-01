import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers['x-ai-gateway-key'];
    const expected = this.config.get<string>('AI_GATEWAY_KEY');

    if (!provided || provided !== expected) {
      throw new UnauthorizedException('API key inválida o ausente');
    }

    return true;
  }
}
