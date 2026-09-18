import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @CurrentUser() — Decorator customizado para extrair o usuário autenticado.
 *
 * Uso em controllers REST:
 *   @Get('profile')
 *   @UseGuards(JwtAuthGuard)
 *   getProfile(@CurrentUser() user: { userId: string; email: string; role: string }) { ... }
 *
 * CONCEITO: Decorators customizados simplificam a extração de dados recorrentes
 * do contexto da request, tornando o código mais limpo e declarativo.
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // Se data for especificado, retorna apenas aquele campo (ex: @CurrentUser('userId'))
    return data ? user?.[data] : user;
  },
);
