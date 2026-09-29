# Design Tokens — Delivery Hub

Referência completa dos tokens visuais do projeto. Consulte este arquivo quando
precisar de valores exatos de cor, tipografia ou espaçamento.

---

## Paleta de Cores

### Brand (Identidade Principal)

| Token         | Valor     | Classe Tailwind | Uso                            |
|---------------|-----------|-----------------|--------------------------------|
| `brand-50`    | `#fff7ed` | `bg-orange-50`  | Fundo de card selecionado      |
| `brand-500`   | `#f97316` | `bg-orange-500` | CTA principal, badges          |
| `brand-600`   | `#ea580c` | `bg-orange-600` | Hover de CTAs                  |

### Superfícies & Neutros

| Token           | Classe Tailwind     | Uso                        |
|-----------------|---------------------|----------------------------|
| Fundo página    | `bg-zinc-50`        | Background geral           |
| Card            | `bg-white`          | Superfície de cards        |
| Borda sutil     | `border-zinc-200/60`| Separação leve entre cards |
| Texto primário  | `text-zinc-900`     | Títulos, preços            |
| Texto secundário| `text-zinc-500`     | Metadados, horários        |
| Texto terciário | `text-zinc-400`     | Placeholders, hints        |

### Feedback & Status

| Status       | Cor           | Classe BG        | Classe Text       | Uso                     |
|--------------|---------------|------------------|--------------------|-------------------------|
| Sucesso      | Esmeralda     | `bg-emerald-50`  | `text-emerald-700` | Entregue, aprovado      |
| Alerta       | Âmbar         | `bg-amber-50`    | `text-amber-700`   | Em preparo, a caminho   |
| Erro         | Rosa/Vermelho | `bg-rose-50`     | `text-rose-700`    | Cancelado, erro         |
| Info         | Azul          | `bg-blue-50`     | `text-blue-700`    | Notificações neutras    |

---

## Tipografia

| Elemento          | Classes Tailwind                                  |
|-------------------|---------------------------------------------------|
| Título de seção   | `text-lg font-semibold tracking-tight text-zinc-900` |
| Título de card    | `text-sm font-semibold text-zinc-800`             |
| Preço (moeda)     | `text-xs font-semibold text-zinc-500`             |
| Preço (valor)     | `text-xl font-extrabold text-zinc-900`            |
| Metadado          | `text-xs text-zinc-500`                           |
| Badge             | `text-xs font-semibold`                           |

---

## Elevação & Raios

| Elemento          | Classes Tailwind                                       |
|-------------------|--------------------------------------------------------|
| Card normal       | `rounded-2xl shadow-sm hover:shadow-md transition-shadow` |
| Modal / Drawer    | `rounded-2xl shadow-xl`                                |
| Botão principal   | `rounded-xl`                                           |
| Badge / Avatar    | `rounded-full`                                         |
| Input             | `rounded-xl`                                           |

---

## Animações

| Nome       | Keyframe CSS     | Uso                       |
|------------|------------------|---------------------------|
| `fadeIn`   | opacity 0 → 1    | Montagem de componentes   |
| `slideUp`  | translateY(20px) → 0 | Modais, toasts        |
| `slideLeft`| translateX(100%) → 0 | Drawer lateral        |

---

## Breakpoints

| Tamanho  | Largura mínima | Uso principal           |
|----------|----------------|-------------------------|
| `sm`     | 640px          | Ajustes mobile/tablet   |
| `md`     | 768px          | Layout tablet           |
| `lg`     | 1024px         | Layout desktop          |
| `xl`     | 1280px         | Desktop grande          |
