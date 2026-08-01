import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { JwtPayload, KnowledgeRole, UserRole } from 'src/modules/auth/auth.service';
import {
  canPerformKnowledgeAction,
  KnowledgeAction,
  KnowledgePermissionFlags,
} from 'src/domain/knowledge/knowledge-permissions';
import { KNOWLEDGE_ACTION_KEY } from '../decorators/knowledge-action.decorator';

function jwtUser(req: Request): JwtPayload | undefined {
  return (req as unknown as Record<string, JwtPayload | undefined>)['jwtUser'];
}

// Los ADMIN generales de la plataforma siguen teniendo acceso total al Centro
// de Conocimiento (equivalente a SUPER_ADMIN) sin necesidad de setear knowledgeRole.
export function resolveKnowledgeRole(user: JwtPayload | undefined): KnowledgeRole | null {
  if (!user) return null;
  if (user.role === UserRole.ADMIN) return KnowledgeRole.SUPER_ADMIN;
  return user.knowledgeRole ?? null;
}

@Injectable()
export class KnowledgePermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const action = this.reflector.getAllAndOverride<KnowledgeAction | undefined>(KNOWLEDGE_ACTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!action) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const role = resolveKnowledgeRole(jwtUser(request));

    const flags: KnowledgePermissionFlags = {
      supervisorCanPublish: this.config.get<string>('KNOWLEDGE_SUPERVISOR_CAN_PUBLISH') === 'true',
      supervisorCanArchive: this.config.get<string>('KNOWLEDGE_SUPERVISOR_CAN_ARCHIVE') === 'true',
      supervisorCanViewAudit: this.config.get<string>('KNOWLEDGE_SUPERVISOR_CAN_VIEW_AUDIT') === 'true',
    };

    if (!canPerformKnowledgeAction(role, action, flags)) {
      throw new ForbiddenException(
        `Tu rol (${role ?? 'sin rol asignado en el Centro de Conocimiento'}) no puede realizar la acción "${action}"`,
      );
    }

    (request as unknown as Record<string, unknown>)['knowledgeRole'] = role;
    return true;
  }
}
