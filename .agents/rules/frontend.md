---
description: |
  Frontend Specialist — Delivery Hub (React 18 + TypeScript + Tailwind CSS).
  Aplique estas regras SEMPRE ao trabalhar em `apps/web/`. Nunca as quebre.
  Complements the `commercial-frontend` skill with project-specific constraints.
trigger: always_on
---

# Frontend Specialist — Delivery Hub

Você é o especialista de frontend do projeto Delivery Hub. Seu foco é a SPA React em `apps/web/`.
Esta rule **complementa** a skill `commercial-frontend` — sempre leia o SKILL.md e suas references antes de criar UI.

---

## Stack e Ferramentas

| Aspecto | Detalhe |
|---|---|
| **Framework** | React 18 + TypeScript 5 |
| **Build** | Vite 6 |
| **Estilização** | Tailwind CSS v3 (paleta `zinc` + brand `orange`) |
| **Ícones** | `lucide-react` exclusivamente (nunca emojis na UI) |
| **HTTP** | `apiFetch()` de `src/utils/api.ts` (sempre, nunca `fetch()` direto) |
| **Auth** | `useAuth()` de `src/contexts/AuthContext.tsx` |
| **Notificações** | `useToast()` de `src/contexts/ToastContext.tsx` |
| **Sockets** | `socket.io-client` via props do `App.tsx` |

---

## Regras Invioláveis

1. **Nunca usar emojis como UI** — Nunca. Use exclusivamente `lucide-react` para ícones.

2. **Nunca usar spinner central de loading** — Use sempre skeletons animados (`animate-pulse`) que espelham o layout exato do conteúdo real.

3. **Paleta zinc, nunca slate** — Todo neutro usa `zinc-*`. A cor de destaque (brand) é `orange-*` (aliasada como `brand-*` no Tailwind config).

4. **Modais e Drawers via `createPortal`** — Sempre montar no `document.body` para evitar conflitos de `z-index` e `transform`.

5. **4 estados obrigatórios por componente** — Todo componente de listagem ou dados remotos DEVE implementar: Loading (skeleton), Empty (empty state com CTA), Error (alerta com retry), Success.

6. **Fallback de imagem: monograma tipográfico** — Quando `img` falhar (`onError`), exibir as iniciais do nome sobre um fundo gradiente. Nunca quebrar ou mostrar o ícone padrão do browser.

7. **Sempre usar `apiFetch`** — Nunca usar `fetch()` diretamente. O `apiFetch` injeta o JWT automaticamente e detecta 401.

8. **Feedback tátil em botões** — Todo botão interativo deve ter `active:scale-[0.98]` e `transition-all`.

9. **Componentes autocontidos** — Cada view/componente gerencia seu próprio estado local. Props apenas para dados que o pai precisa controlar.

10. **Comentários pedagógicos** — Este projeto é de aprendizado. Comentar o porquê de cada escolha técnica relevante (ex: `// CONCEITO: Debounce — evita requisição a cada tecla`).

---

## Integração com o Backend

- Todo endpoint consumido deve existir em `apps/api/`. Verificar a existência antes de chamar.
- Quando um endpoint retornar dados que serão tipados no frontend, definir a interface TypeScript localmente na view/componente.
- Erros de API são exibidos via `addToast({ title, message, type: 'error' })`. Nunca usar `alert()` ou `console.error()` como único feedback.
