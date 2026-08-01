import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { canPerformAutomationAction, AutomationAction } from 'src/domain/automation/automation-permissions';
import { resolveKnowledgeRole } from '../guards/knowledge-permission.guard';
import { JwtPayload } from 'src/modules/auth/auth.service';
import { AUTOMATION_ACTION_KEY } from '../decorators/automation-action.decorator';

function jwtUser(req: Request): JwtPayload | undefined {
  return (req as unknown as Record<string, JwtPayload | undefined>)['jwtUser'];
}

@Injectable()
export class AutomationPermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const action = this.reflector.getAllAndOverride<AutomationAction | undefined>(AUTOMATION_ACTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!action) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const role = resolveKnowledgeRole(jwtUser(request));

    if (!canPerformAutomationAction(role, action)) {
      throw new ForbiddenException(
        `Tu rol (${role ?? 'sin rol asignado'}) no puede realizar la acción "${action}" en el motor de automatización`,
      );
    }

    return true;
  }
}
