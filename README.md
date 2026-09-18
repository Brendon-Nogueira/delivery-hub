# DeliveryHub — Hub de Pedidos & Logística em Tempo Real

> Simulador de delivery e rastreamento GPS em tempo real com **NestJS**, **WebSockets**, **Redis**, **PostgreSQL**, **Prisma**, **React (Vite)** e **Leaflet**.

---

## Estado Atual do Projeto

O projeto encontra-se em estágio **funcional e demonstrável (MVP)**, com toda a arquitetura base de microsserviços/monorepo configurada e compilando com sucesso:

- [x] **Monorepo Estruturado**: Configurado com **Turborepo** e **pnpm workspaces** integrando backend (`apps/api`), frontend (`apps/web`) e tipos compartilhados (`packages/shared`).
- [x] **Backend NestJS Operacional**:
  - **REST API** com rotas prefixadas em `/api/v1` (Autenticação, Pedidos, Entrega, Cardápio, Restaurantes).
  - **GraphQL Playground** em `/graphql` (Code-first com `@nestjs/graphql` e Apollo Server).
  - **WebSockets (Socket.io)** com namespaces dedicados:
    - `/orders`: Notificações de novos pedidos e mudanças de status (`PENDING` ➔ `DELIVERED`).
    - `/delivery`: Transmissão contínua de telemetria GPS (`sendLocation` e `driverLocationUpdate`).
- [x] **Cache de GPS com Redis 7**:
  - Persistência in-memory com TTL automático de 30 segundos sob a chave `driver:location:{orderId}`.
  - Baixíssima latência (~0.1ms por escrita), evitando sobrecarga no banco relacional.
- [x] **Banco de Dados PostgreSQL 16 + Prisma ORM**:
  - Modelagem completa de Usuários, Roles (`CUSTOMER`, `RESTAURANT_OWNER`, `DRIVER`, `ADMIN`), Restaurantes, Itens do Cardápio, Pedidos e Histórico de Status.
- [x] **Frontend React / Vite + TailwindCSS**:
  - **Mapa Interativo (Leaflet)** centralizado em **Paraisópolis - MG** (Centro / Praça Cel. José Vieira até Bairro Residencial).
  - Marcadores visuais customizados: Restaurante, Cliente e Entregador (com anéis de pulso de radar pulsante).
  - **Cálculo dinâmico de Distância e Previsão (ETA)** em metros e minutos.
  - **Alerta de Proximidade Inteligente**: Dispara banner dinâmico quando o entregador está a menos de 450m do endereço do cliente.
  - **Stepper de Status**: Acompanhamento visual dos estágios do pedido.
  - **Console de Telemetria ao Vivo**: Visualização em tempo real dos frames WebSocket recebidos e gravações no Redis.
  - **Simulador de Rota Integrado**: Botão que dispara animação contínua da rota do entregador rua a rua.

---

## Stacks Utilizadas e a Utilidade de Cada Uma

| Tecnologia | Categoria | Por que foi escolhida e qual sua utilidade no projeto? |
| :--- | :--- | :--- |
| **Turborepo + pnpm** | Monorepo Orchestration | Permite gerenciar múltiplos pacotes (`api`, `web`, `shared`) no mesmo repositório com compartilhamento instantâneo de tipos TypeScript, compilação paralela e cache de build inteligente. |
| **NestJS (Node.js / TS)** | Backend Framework | Framework corporativo estruturado em módulos, injeção de dependências, decorators e arquitetura limpa. Facilita manter REST, GraphQL e WebSockets no mesmo ecossistema. |
| **Socket.io (WebSockets)** | Real-Time Engine | Protocolo bidirecional full-duplex de baixa latência (~50ms). Substitui o *polling* HTTP tradicional (que faria centenas de requests desnecessários), enviando a localização da moto instantaneamente para o mapa do cliente. |
| **Redis 7 (ioredis)** | Cache In-Memory | Armazena a localização do entregador na memória RAM. Como o GPS envia coordenadas a cada 1.5s - 3s, o Redis grava em ~0.1ms e usa **TTL de 30s** para limpar posições antigas automaticamente se o entregador ficar offline. |
| **PostgreSQL 16** | Banco de Dados Relacional | Banco transacional ACID robusto. Responsável pela persistência definitiva e segura: usuários com senhas hash, restaurantes, catálogo de produtos, pedidos fechados e histórico financeiro. |
| **Prisma ORM** | Object-Relational Mapping | Camada de acesso ao banco com total segurança de tipos (Type-Safety). Gera migrações, client tipado para TypeScript e elimina bugs de schema em tempo de desenvolvimento. |
| **GraphQL (Apollo Server)** | Camada de Consulta Flexível | Utilizado para consultas flexíveis de catálogo de restaurantes e itens de cardápio, permitindo que clientes peçam exatamente os campos necessários sem *over-fetching*. |
| **React 18 + Vite** | Frontend Library & Bundler | Vite oferece Hot Module Replacement (HMR) instantâneo em milissegundos. React gerencia os estados reativos do mapa, marcadores e conexões de socket de forma fluida. |
| **TailwindCSS** | Estilização & Design System | Criação de interface moderna, responsiva, dark theme, sombras suaves e micro-animações sem a necessidade de arquivos CSS gigantescos e desorganizados. |
| **Leaflet** | Biblioteca de Mapas | Renderização leve de mapas interativos via OpenStreetMap. Permite criar marcadores com HTML/SVG dinâmico (efeito radar da moto e pins personalizados) sem custos com Google Maps API. |
| **Docker & Docker Compose** | Infraestrutura e Containers | Sobe com um único comando os serviços essenciais de banco (**PostgreSQL 16**) e cache (**Redis 7**) de forma idêntica em qualquer máquina de desenvolvimento. |

---

## Estrutura do Repositório

```text
delivery-hub/
├── .env                              # Variáveis de ambiente gerais (DB, Redis, JWT)
├── docker-compose.yml                # Configuração dos containers Postgres e Redis
├── package.json                      # Scripts raiz do Monorepo
├── pnpm-workspace.yaml               # Definição dos pacotes do workspace pnpm
├── turbo.json                        # Pipeline de builds e tarefas do Turborepo
│
├── apps/
│   ├── api/                          # BACKEND NESTJS
│   │   ├── prisma/
│   │   │   └── schema.prisma         # Modelagem das tabelas do Postgres
│   │   ├── src/
│   │   │   ├── auth/                 # Autenticação JWT, login, registro e Guards
│   │   │   ├── common/
│   │   │   │   ├── decorators/       # Decorators customizados (@CurrentUser, etc.)
│   │   │   │   ├── prisma/           # Serviço de conexão com Postgres via Prisma
│   │   │   │   └── redis/            # Serviço e Módulo Global do Redis (ioredis)
│   │   │   ├── delivery/             # MÓDULO DE ENTREGA & GPS
│   │   │   │   ├── delivery.controller.ts # Endpoints REST & Simulador de Rota
│   │   │   │   ├── delivery.gateway.ts    # WebSocket Gateway (/delivery)
│   │   │   │   ├── delivery.service.ts    # Gravação no Redis (driver:location)
│   │   │   │   └── dto/                   # DTOs de envio de GPS
│   │   │   ├── menu/                 # Gestão de itens e cardápios
│   │   │   ├── orders/               # MÓDULO DE PEDIDOS
│   │   │   │   ├── orders.controller.ts   # CRUD de pedidos via REST
│   │   │   │   ├── orders.gateway.ts      # WebSocket Gateway (/orders)
│   │   │   │   └── orders.service.ts      # Transição de status do pedido
│   │   │   ├── restaurants/          # Gestão de restaurantes
│   │   │   ├── users/                # Gestão de perfis e usuários
│   │   │   ├── app.module.ts         # Módulo raiz NestJS
│   │   │   └── main.ts               # Ponto de entrada (Bootstrap HTTP + WS)
│   │   └── tsconfig.json
│   │
│   └── web/                          # FRONTEND REACT (VITE)
│       ├── src/
│       │   ├── components/
│       │   │   ├── MapTracker.tsx    # Mapa Leaflet com GPS animado e radar
│       │   │   ├── StatusStepper.tsx # Linha do tempo dos status do pedido
│       │   │   └── TelemetryLog.tsx  # Console visual de pacotes WS e Redis
│       │   ├── App.tsx               # Dashboard principal do cliente (Paraisópolis MG)
│       │   ├── main.tsx              # Ponto de entrada React DOM
│       │   └── index.css             # Configurações do TailwindCSS e estilos do mapa
│       ├── index.html                # HTML base com fontes e Leaflet CSS
│       ├── tailwind.config.js        # Tokens de cores e extensões de design
│       └── vite.config.ts            # Configurações do Vite e proxies
│
└── packages/
    └── shared/                       # PACOTE COMPARTILHADO DE TIPOS
        └── src/
            ├── enums/
            │   ├── order-status.enum.ts # PENDING, ACCEPTED, IN_TRANSIT, etc.
            │   └── user-role.enum.ts    # CUSTOMER, RESTAURANT_OWNER, DRIVER, ADMIN
            ├── types/                   # Interfaces DTO de Pedido, Usuário e GPS
            └── index.ts                 # Constantes WS_EVENTS e exports centralizados
```

---

## Como Executar o Projeto Localmente

### 1. Pré-requisitos
- **Node.js**: v18+ (recomendado v20+)
- **pnpm**: v9+ ou v12+
- **Docker** e **Docker Desktop** ativos

---

### 2. Passo a Passo de Instalação

1. **Suba os containers de infraestrutura (PostgreSQL e Redis)**:
   ```bash
   docker compose up -d
   ```

2. **Instale as dependências do monorepo**:
   ```bash
   pnpm install
   ```

3. **Gere os schemas e migrações do Prisma**:
   ```bash
   pnpm run db:push
   ```

---

### 3. Rodando o Projeto

Você pode iniciar o backend e o frontend simultaneamente ou em terminais separados:

- **Iniciar Tudo em Paralelo**:
  ```bash
  pnpm run dev
  ```

- **Ou em Terminais Separados**:
  - **Terminal 1 (Backend API)**:
    ```bash
    pnpm run dev:api
    ```
  - **Terminal 2 (Frontend Web)**:
    ```bash
    pnpm run dev:web
    ```

---

## Endereços de Acesso

| Serviço | URL | Descrição |
| :--- | :--- | :--- |
| **Painel Web do Cliente** | [http://localhost:3000](http://localhost:3000) | Dashboard interativo com mapa de Paraisópolis - MG e simulador |
| **API REST** | [http://localhost:4000/api/v1](http://localhost:4000/api/v1) | Endpoints REST de autenticação, pedidos e telemetria |
| **GraphQL Playground** | [http://localhost:4000/graphql](http://localhost:4000/graphql) | Interface interativa de queries e mutations GraphQL |
| **WebSocket /delivery** | `ws://localhost:4000/delivery` | Canal em tempo real para streaming de coordenadas GPS |
| **WebSocket /orders** | `ws://localhost:4000/orders` | Canal em tempo real para status e ciclo de vida dos pedidos |

---

## Simulação de GPS (Paraisópolis - MG)
Ao abrir a aplicação em [http://localhost:3000](http://localhost:3000), basta clicar no botão **"Simular Rota do Entregador"**:
1. O backend/frontend dispara coordenadas interpoladas partindo do **Centro de Paraisópolis (Praça Cel. José Vieira)** em direção ao **Bairro Residencial**.
2. Cada ponto atualiza a chave no **Redis** e emite broadcast via **WebSocket**.
3. A moto se move suavemente no mapa com pulso de radar, recalcula a distância restante e aciona o alerta de aproximação ao chegar a menos de 450m do destino!
