---
name: commercial-frontend
description: >-
  Use this skill when building, refactoring, or reviewing UI components and
  visual design in the delivery-hub front-end (apps/web). Enforces commercial-grade
  UI/UX standards comparable to iFood, DoorDash, and Uber Eats using React,
  Tailwind CSS (zinc palette), and Lucide icons.
---

# Commercial Front-End — Delivery Hub

Diretrizes de design e implementação para manter o front-end do Delivery Hub com
qualidade visual de produto comercial em produção.

---

## Contexto do Projeto

| Aspecto       | Detalhe                                       |
|---------------|-----------------------------------------------|
| **Monorepo**  | `apps/api` (NestJS) · `apps/web` (React/Vite) |
| **Stack Web** | React 18 + TypeScript + Vite                  |
| **Estilização** | Tailwind CSS v3 (paleta `zinc`)            |
| **Ícones**    | `lucide-react` (exclusivamente)               |
| **Utilitários** | `clsx` + `tailwind-merge` via função `cn()` |
| **Referência** | iFood, DoorDash, Uber Eats, Wolt             |

---

## Arquitetura de Arquivos (apps/web)

```text
apps/web/src/
├── App.tsx                    # Layout principal + roteamento por role
├── index.css                  # Design system (keyframes, variáveis)
├── main.tsx                   # Entry point
├── components/
│   ├── AuthModal.tsx          # Login/registro
│   ├── CartDrawer.tsx         # Carrinho lateral (via createPortal)
│   ├── MapTracker.tsx         # Mapa Leaflet de rastreamento
│   ├── MenuItemCard.tsx       # Card de produto com fallback visual
│   ├── RoleNavigation.tsx     # Navegação por perfil
│   ├── StatusStepper.tsx      # Barra de progresso do pedido
│   ├── TelemetryLog.tsx       # Log de eventos WebSocket
│   └── UserHeader.tsx         # Cabeçalho do usuário
├── contexts/
│   └── AuthContext.tsx        # JWT + estado de autenticação
├── utils/
│   └── apiFetch.ts            # Interceptor HTTP com token
└── views/
    ├── CustomerView.tsx       # Tela do cliente (cardápio + carrinho)
    ├── DriverView.tsx         # Tela do entregador
    └── RestaurantView.tsx     # KDS — painel do restaurante
```

---

## Regras Invioláveis

Estas regras **nunca** devem ser quebradas, independente do contexto:

1. **Nunca usar emojis como UI** — Emojis (🍳 🍺 🛵 📦) não são ícones. Use
   exclusivamente `lucide-react` para ícones e fotografia real ou monogramas
   tipográficos para imagens de produto.

2. **Nunca usar spinner centralizado como loading** — Use skeletons animados
   (`animate-pulse`) que espelham o layout real do conteúdo.

3. **Paleta é `zinc`, não `slate`** — O projeto migrou para `zinc`. Não
   introduzir classes `slate-*` em código novo.

4. **Modais/Drawers via `createPortal`** — Renderizar modais e drawers no
   `document.body` para evitar problemas de `z-index` e `transform`.

5. **Todo componente visual implementa 4 estados** — Loading, Empty, Error,
   Success. Sem exceção.

---

## Fluxo de Trabalho

Ao criar ou modificar qualquer componente de UI, siga esta sequência:

### Passo 1 — Consultar Tokens
Leia os design tokens em [references/design-tokens.md](./references/design-tokens.md)
para garantir consistência de cores, tipografia e elevação.

### Passo 2 — Consultar Padrões de Componente
Verifique se existe um padrão definido em
[references/component-patterns.md](./references/component-patterns.md) para o
tipo de componente sendo criado.

### Passo 3 — Implementar
- Usar a função `cn()` para composição condicional de classes
- Seguir a paleta `zinc` para neutros + `orange` para brand
- Incluir `transition-all` ou `transition-colors` em elementos interativos
- Usar `active:scale-[0.98]` em botões para feedback tátil

### Passo 4 — Validar

Antes de considerar a implementação completa, verificar:

- [ ] O componente é responsivo (mobile → desktop)?
- [ ] Os 4 estados de UI estão implementados?
- [ ] Ícones são exclusivamente do `lucide-react`?
- [ ] Imagens têm fallback visual (monograma, não ícone quebrado)?
- [ ] Animações e transições estão presentes em elementos interativos?
- [ ] O visual se parece com um app comercial em produção?
- [ ] Nenhuma classe `slate-*` foi introduzida?

---

## Anti-Patterns (O que NÃO fazer)

| ❌ Errado | ✅ Correto |
|-----------|-----------|
| Emoji como imagem de produto | Fotografia real ou monograma tipográfico |
| `bg-slate-50` para fundo | `bg-zinc-50` |
| Spinner estático centralizado | Skeletons que espelham o layout |
| Modal renderizado inline | Modal via `createPortal` no `document.body` |
| Cores neon/gradientes "IA" | Paleta comercial neutra com destaques brand |
| Imagem `<img>` sem `onError` | Fallback com iniciais sobre fundo gradiente |
| Componente sem estado empty | Ilustração + mensagem + CTA |
