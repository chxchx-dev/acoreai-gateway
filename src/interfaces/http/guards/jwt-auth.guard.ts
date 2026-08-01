import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from 'src/modules/auth/auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const payload = await this.authService.verifyBearerHeader(
      request.headers['authorization'],
    );

    if (!payload) {
      throw new UnauthorizedException('Token de autenticación requerido');
    }

    (request as unknown as Record<string, unknown>)['jwtUser'] = payload;
    return true;
  }
}
