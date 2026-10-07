---
name: development-workflow
description: >-
  Use this skill when developing new features, adding API endpoints, updating database schemas,
  creating real-time WebSocket events, fixing bugs, or executing pre-flight verification across
  the Delivery Hub monorepo.
---

# Development Workflow & Runbooks — Delivery Hub

Este guia reúne os procedimentos operacionais padrão (SOPs / Runbooks) para implementação, manutenção e validação no monorepo do **Delivery Hub**.

---

## Runbook 1: Nova Funcionalidade Ponta a Ponta (End-to-End)

Siga estas etapas ao criar uma funcionalidade que envolve banco, API e interface de usuário.

```text
[packages/shared] -> [Prisma Schema] -> [apps/api (NestJS)] -> [apps/web (React)] -> [Quality Gate]
```

### Passo 1: Contrato Compartilhado
1. Abra `packages/shared/src/types/` e crie ou ajuste as interfaces DTO:
   ```typescript
   export interface MinhaFeatureDTO {
     id: string;
     titulo: string;
     // ...
   }
   ```
2. Exporte a interface em `packages/shared/src/index.ts`.
3. Valide o build do shared:
   ```bash
   pnpm --filter @delivery-hub/shared build
   ```

### Passo 2: Modelo de Dados (Prisma)
1. Edite `apps/api/prisma/schema.prisma` com o novo modelo ou campos.
2. Aplique a alteração no banco e gere o client:
   ```bash
   pnpm --filter @delivery-hub/api db:push
   ```

### Passo 3: Módulo Backend (NestJS)
1. Crie ou estenda o módulo em `apps/api/src/[recurso]/`:
   - `dto/create-[recurso].dto.ts`: valide com `class-validator`.
   - `[recurso].service.ts`: lógica de negócio e queries Prisma.
   - `[recurso].controller.ts`: exponha endpoints protegidos por `JwtAuthGuard` + `RolesGuard`.
2. Adicione comentários explicativos com `// CONCEITO:`.

### Passo 4: Interface do Usuário (React)
1. Crie o componente ou view em `apps/web/src/components/` ou `apps/web/src/views/`.
2. Implemente obrigatoriamente os **4 estados**:
   - **Loading:** Use o componente `<Skeleton />`.
   - **Empty:** Mensagem amigável com botão de ação (CTA).
   - **Error:** Alerta com feedback e botão de retry.
   - **Success:** Conteúdo renderizado.
3. Use exclusivamente `apiFetch()` para comunicação HTTP.
4. Adicione micro-interações táteis nos botões com `active:scale-[0.98]`.

### Passo 5: Verificação
1. Execute o build unificado:
   ```bash
   pnpm build
   ```
2. Verifique se não houve regressão de tipagem.

---

## Runbook 2: Eventos em Tempo Real (WebSockets)

Use este fluxo para qualquer interação síncrona/real-time (pedidos, telemetria GPS, notificações).

### Passo 1: Registrar Evento
1. Adicione a constante do evento em `packages/shared/src/index.ts` sob `WS_EVENTS`:
   ```typescript
   export const WS_EVENTS = {
     // ...
     NOVO_EVENTO: 'nomeDoEvento',
   } as const;
   ```

### Passo 2: Gateway NestJS
1. No gateway apropriado (`orders.gateway.ts` ou `delivery.gateway.ts`):
   - **Para receber mensagens:** crie `@SubscribeMessage(WS_EVENTS.NOVO_EVENTO)`.
   - **Para transmitir mensagens:** transmita **estritamente para a room específica**:
     ```typescript
     this.server.to(`order:${orderId}`).emit(WS_EVENTS.NOVO_EVENTO, payload);
     ```
   - Nunca use broadcast global para dados sensíveis de clientes ou entregadores.

### Passo 3: Frontend Consumer
1. Em `apps/web/src/contexts/SocketContext.tsx`:
   - Garanta que tanto o `ordersSocket` quanto o `deliverySocket` entrem nas rooms necessárias (`joinOrderRoom`, `joinDeliveryRoom`).
2. No componente que consome o evento:
   - Adicione listener no socket apropriado com cleanup no `return () => { socket.off(...) }`.

---

## Runbook 3: Resolução de Conflitos de Portas e Processos Zumbis

Antes de subir servidores de desenvolvimento locais, garanta que as portas 3000 e 4000 estão livres.

### Diagnóstico no PowerShell (Windows):
```powershell
Get-NetTCPConnection -LocalPort 3000, 4000 -State Listen -ErrorAction SilentlyContinue | Select-Object LocalPort, OwningProcess
```

### Finalização Segura:
Se houver processos presos:
```powershell
Stop-Process -Id <PID> -Force
```

Após liberar, execute os servidores:
- **Tudo junto:** `pnpm dev`
- **Apenas Frontend:** `pnpm dev:web` (Porta 3000)
- **Apenas Backend:** `pnpm dev:api` (Porta 4000)

---

## Runbook 4: Pre-flight Checklist (Antes de cada Commit / PR)

- [ ] `packages/shared` compilado e exportando novos tipos.
- [ ] Schema do Prisma sincronizado (`pnpm db:push`).
- [ ] Nenhum emoji utilizado como ícone de UI (`lucide-react` utilizado).
- [ ] Nenhum spinner central de loading (Skeletons utilizados).
- [ ] `pnpm build` executado e aprovado com **0 erros**.
- [ ] Comentários pedagógicos `// CONCEITO:` incluídos no código relevante.
