import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload, UserRole } from 'src/modules/auth/auth.service';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as unknown as Record<string, JwtPayload>)['jwtUser'];

    if (user?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Solo administradores pueden acceder a este recurso');
    }

    return true;
  }
}
