import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@delivery-hub/shared';

export const ROLES_KEY = 'roles';

/**
 * @Roles() — Decorator para definir quais roles têm acesso a um endpoint.
 *
 * Uso:
 *   @Roles(UserRole.ADMIN, UserRole.RESTAURANT_OWNER)
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   someEndpoint() { ... }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
