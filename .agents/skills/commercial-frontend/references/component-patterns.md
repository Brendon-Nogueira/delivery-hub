# Padrões de Componentes — Delivery Hub

Referência de padrões de UI para cada tipo de componente do sistema.

---

## Cards de Restaurante / Prato

### Imagens
- Proporção constante: `aspect-video` ou `aspect-square`
- `object-cover` com cantos arredondados
- Zoom suave no hover: `group-hover:scale-105 transition-transform duration-300`
- **Fallback obrigatório**: quando a URL da imagem falhar, exibir monograma
  tipográfico (iniciais do nome) sobre fundo gradiente — nunca mostrar ícone
  quebrado ou emoji.

### Badges de Destaque
- Sobrepostos na imagem com backdrop-blur:
  ```
  bg-white/90 backdrop-blur-sm text-zinc-800 text-xs font-semibold
  px-2 py-0.5 rounded-full shadow-sm
  ```
- Tags de "Frete Grátis", "Mais Vendido" sempre visíveis

### Linha de Métricas
- Avaliação: ícone estrela `Star` de lucide (`text-amber-400 fill-amber-400`)
- Tempo: ícone `Clock` + texto (ex: `30-45 min`)
- Entrega: ícone `Bike` + valor do frete

---

## Botões & Micro-Interações

### Feedback Tátil
- Clique: `active:scale-[0.98]`
- Hover: `transition-all duration-150`

### Botão Adicionar / Contador
- Quantidade 0: Botão com ícone `+` ou texto "Adicionar"
- Quantidade > 0: Grupo compacto `[-] [número] [+]`

### Carrinho Flutuante
- Mobile: `fixed bottom-4 inset-x-4 z-50`
- Desktop: `md:static` (integrado ao layout)

---

## Estados Obrigatórios de UI

Todo componente deve implementar estes 4 estados:

| Estado      | Implementação                                                |
|-------------|--------------------------------------------------------------|
| **Loading** | Skeletons animados (`animate-pulse bg-zinc-200 rounded-xl`)  |
| **Empty**   | Ícone contextual + título amigável + botão CTA               |
| **Error**   | Alerta visual com opção "Tentar novamente"                   |
| **Success** | Animação de confirmação (badge pulsante ou toast)            |

> **Nunca** use um spinner estático centralizado como loading state.

---

## Barra de Progresso de Pedido

Linha do tempo visual com 4 etapas:
```
Confirmado → Preparando → Saiu para entrega → Entregue
```

Cada etapa com:
- Ícone do lucide-react
- Cor de status conforme tabela de feedback (emerald/amber/zinc)
- Conector visual entre etapas

---

## Mapa de Rastreamento (Leaflet)

- Container: `rounded-2xl overflow-hidden shadow-inner border border-zinc-200`
- Marcador personalizado para entregador
- Trajeto com polilinha suave
