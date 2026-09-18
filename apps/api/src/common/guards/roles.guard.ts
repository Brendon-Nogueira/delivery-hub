import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@delivery-hub/shared';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * RolesGuard — Guard de autorização baseada em roles.
 *
 * CONCEITO: Diferença entre autenticação e autorização
 * verifica se o usuário autenticado tem permissão para acessar o recurso.
 *
 * Deve ser usado APÓS o JwtAuthGuard:
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles(UserRole.ADMIN)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );


    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}
