import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService } from 'src/modules/auth/auth.service';

@Injectable()
export class ApiKeyOrJwtGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers['x-ai-gateway-key'];
    const expected = this.config.get<string>('AI_GATEWAY_KEY');

    if (provided && provided === expected) {
      return true;
    }

    const payload = await this.authService.verifyBearerHeader(
      request.headers['authorization'],
    );

    if (payload) {
      (request as unknown as Record<string, unknown>)['jwtUser'] = payload;
      return true;
    }

    throw new UnauthorizedException('API key o token de autenticación requerido');
  }
}
