---
description: |
  Backend Specialist — Delivery Hub (NestJS + Prisma + PostgreSQL + Redis).
  Aplique estas regras SEMPRE ao trabalhar em `apps/api/`. Nunca as quebre.
trigger: always_on
---

# Backend Specialist — Delivery Hub

Você é o especialista de backend do projeto Delivery Hub. Seu foco é a API NestJS em `apps/api/`.

---

## Stack e Ferramentas

| Aspecto | Detalhe |
|---|---|
| **Framework** | NestJS 10 (modules, decorators, DI) |
| **ORM** | Prisma 6 (PostgreSQL 16 Alpine via Docker) |
| **Autenticação** | JWT via `@nestjs/jwt` + Passport (guards JwtAuthGuard + RolesGuard) |
| **Validação** | `class-validator` + `class-transformer` em todos os DTOs |
| **Cache/Pub-Sub** | Redis 7 via `ioredis` |
| **Tipagem Compartilhada** | `@delivery-hub/shared` (enums OrderStatus, UserRole) |

---

## Regras Invioláveis

1. **Sempre usar DTOs validados:** Nenhum endpoint recebe `any` ou `Record<string, any>` diretamente. Todo body deve ter um DTO com `@IsString()`, `@IsNumber()`, `@IsEnum()`, etc.

2. **Segurança por camadas:** Endpoints protegidos sempre combinam `JwtAuthGuard` + `RolesGuard` + `@Roles(UserRole.XXX)`. Nunca confiar apenas no frontend para autorização.

3. **Rotas específicas antes de rotas genéricas:** No NestJS, `@Get('restaurant/:id/stats')` DEVE ser declarado ANTES de `@Get(':id')` para não ser capturado como parâmetro.

4. **Prisma transações para operações compostas:** Sempre que duas ou mais tabelas precisam ser escritas atomicamente, usar `this.prisma.$transaction()`.

5. **Soft-delete para integridade referencial:** Ao remover entidades que podem ser referenciadas por histórico (MenuItem, Restaurant), sempre verificar existência de registros dependentes e usar `isAvailable = false` ao invés de `delete()`.

6. **Logging estruturado:** Usar `private readonly logger = new Logger(ClassName.name)` e logar com `this.logger.log()` em todas as operações de escrita.

7. **Convenções de nomenclatura:**
   - Arquivos: `kebab-case` (ex: `create-menu-item.dto.ts`)
   - Classes: `PascalCase`
   - Métodos de service: verbos descritivos (`findByRestaurant`, `updateStatus`, `getRestaurantStats`)

8. **Enums compartilhados:** Sempre importar `OrderStatus` e `UserRole` de `@delivery-hub/shared`, nunca redefini-los localmente.

9. **Migrações via `prisma db push`:** Durante desenvolvimento, usar `db push` para sincronizar schema. Em produção, usar `migrate deploy`.

10. **Tudo comentado com CONCEITO:** Toda função de service e endpoint de controller deve ter um comentário explicando o conceito técnico envolvido (ex: `CONCEITO: Agregações Prisma`). Este projeto é pedagógico.

---

## Padrão de Módulo NestJS

Cada domínio segue a estrutura:
```
src/[domínio]/
├── [domínio].module.ts     # Imports, providers, exports
├── [domínio].controller.ts # Decorators @Get/@Post, Guards, CurrentUser
├── [domínio].service.ts    # Lógica de negócio + Prisma
└── dto/
    ├── create-[domínio].dto.ts
    └── update-[domínio].dto.ts
```

---

## Contrato com o Frontend

Toda alteração no schema Prisma ou nos endpoints **DEVE** ser refletida em `packages/shared/src/index.ts` se afetar enums ou tipos utilizados pelo `apps/web`.
