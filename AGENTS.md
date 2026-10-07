# AGENTS.md — Delivery Hub Monorepo Steering Guide

> **Universal Steering Document**: Este arquivo é o ponto de entrada principal e guia operacional para Agentes de IA (Antigravity, Cursor, Windsurf, Copilot, Claude Code) e engenheiros colaborando no repositório **Delivery Hub**.

---

## 1. Visão Geral da Arquitetura

O **Delivery Hub** é um sistema de pedidos e telemetria logística em tempo real para estabelecimentos e entregadores em Paraisópolis - MG.

```text
delivery-hub/
├── .agents/                    # Customizações do Agente (Regras e Skills)
│   ├── rules/
│   │   ├── workflow.md         # Ciclo de Vida e Protocolo de Engenharia (always_on)
│   │   ├── backend.md          # Padrões NestJS + Prisma + PostgreSQL + Redis
│   │   └── frontend.md         # Padrões React 18 + Tailwind (zinc) + Lucide
│   └── skills/
│       ├── commercial-frontend # Padrão de UX/UI comercial de alta fidelidade
│       └── development-workflow# Runbooks operacionais passo a passo
├── apps/
│   ├── api/                    # Backend: NestJS 10, Prisma 6, WebSockets, Redis
│   └── web/                    # Frontend: React 18 SPA, Vite 6, Leaflet, PWA
├── packages/
│   └── shared/                 # Contrato Único: Enums, DTOs e Eventos WebSocket
└── .github/
    └── workflows/
        └── ci.yml              # Pipeline de CI/CD automatizado no GitHub Actions
```

---

## 2. Tecnologias & Comandos Essenciais

Gerenciador de pacotes: **pnpm v12** com workspaces.  
Orquestrador de tarefas: **Turborepo v2**.

### Scripts de Execução

| Comando | Descrição |
|---|---|
| `pnpm dev` | Inicia monorepo completo (`api` + `web`) via Turbo |
| `pnpm dev:web` | Inicia apenas o frontend Vite em `http://localhost:3000` |
| `pnpm dev:api` | Inicia apenas o backend NestJS em `http://localhost:4000` |
| `pnpm build` | Compilação e tipagem rigorosa de todos os pacotes |
| `pnpm lint` | Análise estática de código com ESLint |
| `pnpm db:push` | Sincroniza schema do Prisma com o banco de dados |
| `pnpm db:seed` | Executa seeds com restaurantes, itens e usuários demo |
| `pnpm db:studio` | Interface web do Prisma para visualização de dados |

---

## 3. Matriz de Responsabilidade das Regras (.agents/rules)

Ao atuar em qualquer tarefa, o agente DEVE respeitar a seguinte hierarquia de regras:

1. **[`workflow.md`](file:///C:/Users/k5h1nj/.gemini/antigravity-ide/scratch/delivery-hub/.agents/rules/workflow.md)** (`always_on`):
   - Protocolo universal de desenvolvimento (5 fases: Descoberta, Contrato, Código, Verificação e Feedback).
   - Gerenciamento de portas e processos (não deixar processos zumbis).
2. **[`backend.md`](file:///C:/Users/k5h1nj/.gemini/antigravity-ide/scratch/delivery-hub/.agents/rules/backend.md)**:
   - DTOs estritos com `class-validator`.
   - Segurança em camadas (`JwtAuthGuard` + `RolesGuard` + `@Roles()`).
   - Soft-delete para MenuItem/Restaurant (`isAvailable = false`).
   - Comentários pedagógicos `// CONCEITO:`.
3. **[`frontend.md`](file:///C:/Users/k5h1nj/.gemini/antigravity-ide/scratch/delivery-hub/.agents/rules/frontend.md)**:
   - **Zero Emojis como UI** (exclusivamente ícones `lucide-react`).
   - Paleta neutra `zinc` + brand `orange`.
   - 4 estados obrigatórios por componente: Loading (Skeleton), Empty, Error, Success.
   - `active:scale-[0.98]` para feedback tátil em botões.
   - Sockets desacoplados via `SocketContext` e Carrinho via `CartContext`.

---

## 4. Skills Disponíveis (.agents/skills)

- **[`commercial-frontend`](file:///C:/Users/k5h1nj/.gemini/antigravity-ide/scratch/delivery-hub/.agents/skills/commercial-frontend/SKILL.md)**: Aplique ao desenhar ou refatorar telas no `apps/web/`, garantindo padrão comercial equivalente a iFood/Uber Eats.
- **[`development-workflow`](file:///C:/Users/k5h1nj/.gemini/antigravity-ide/scratch/delivery-hub/.agents/skills/development-workflow/SKILL.md)**: Guia passo a passo para novas features, migrações de schema, novos eventos WebSocket e hotfixes.

---

## 5. Regras de Ouro (Invioláveis)

1. **Contract-First**: Qualquer alteração em endpoints, modelos ou eventos WebSocket deve começar pelo `packages/shared`.
2. **Zero Erros de Build**: Todo ciclo de desenvolvimento deve ser validado com `pnpm build` passando limpo (0 erros TypeScript).
3. **Sem Processos Concorrentes Ocultos**: Nunca inicie processos dev em portas sem garantir a liberação prévia das portas 3000 e 4000.
4. **Didática & Qualidade**: Mantenha comentários `// CONCEITO:` detalhando a motivação arquitetural de cada decisão relevante.
