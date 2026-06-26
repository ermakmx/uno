# UNO Online — Plan de desarrollo

## Tecnologías

| Componente | Elección |
|---|---|
| Monorepo | pnpm workspaces |
| Lógica compartida | TypeScript puro (paquete `@uno/shared`) |
| Servidor | Node.js + Express + Socket.IO (`@uno/server`) |
| Cliente | Vite + React 18 + TypeScript + TailwindCSS + Zustand (`@uno/client`) |
| Tests unitarios | Vitest |
| Tests E2E | Playwright (fase 6) |
| Despliegue | Docker + docker-compose (fase 7) |

## Estructura del proyecto

```
uno/
├── package.json                    # raíz del monorepo
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .gitignore
├── PLAN.md
├── packages/
│   ├── shared/                     # tipos + reglas del juego (puro TS)
│   │   ├── src/
│   │   │   ├── types.ts            # Card, Color, GameState, eventos
│   │   │   ├── deck.ts            # createDeck(), shuffle()
│   │   │   ├── rules.ts           # isValidMove(), applyCardEffect()
│   │   │   └── index.ts
│   │   └── __tests__/
│   ├── server/                     # autoridad del juego, Socket.IO
│   │   └── src/
│   │       ├── index.ts           # bootstrap Express + Socket.IO
│   │       ├── RoomManager.ts     # gestión de salas
│   │       └── GameRoom.ts        # máquina de estados del juego
│   └── client/                     # frontend Vite + React
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── socket.ts          # conexión Socket.IO
│           ├── store.ts           # Zustand store
│           ├── index.css          # Tailwind
│           ├── pages/
│           │   ├── Home.tsx       # crear / unirse a sala
│           │   ├── Lobby.tsx      # sala de espera
│           │   ├── Game.tsx       # tablero de juego
│           │   └── End.tsx        # pantalla de victoria
│           └── components/
│               ├── CardView.tsx        # carta visible
│               ├── CardBack.tsx        # dorso de carta
│               ├── ColorPicker.tsx     # selector de color (Wild)
│               ├── PlayersBar.tsx      # lista de jugadores
│               └── DirectionIndicator.tsx
```

## Reglas implementadas (UNO clásico)

- **Mazo**: 108 cartas (4 colores × 25 cartas + 4 Wild + 4 Wild+4)
- **Reparto**: 7 cartas por jugador
- **Jugada válida**: mismo color, mismo número/símbolo, o Wild
- **Acciones**: Skip, Reverse, +2, Wild, Wild+4
- **Stacking**: NO (reglas clásicas; con draws pendientes no se puede jugar)
- **UNO!**: se puede cantar al quedar con 1 carta. Si otro jugador te pilla sin cantar, penalización de 2 cartas
- **Victoria**: primer jugador en 0 cartas
- **Tope**: 2–10 jugadores por sala

## Flujo de red (Socket.IO)

| Evento (cliente → servidor) | Descripción |
|---|---|
| `room:create` | Crear sala con nombre de jugador |
| `room:join` { code, name } | Unirse a sala por código |
| `game:start` | Iniciar partida (solo host) |
| `game:play` { cardIndex, chosenColor? } | Jugar carta |
| `game:draw` | Robar carta |
| `game:pass_draw` | Pasar turno tras robar |
| `game:say_uno` | Cantar UNO! |
| `game:call_out` { targetId } | Penalizar a quien no cantó |

| Evento (servidor → cliente) | Descripción |
|---|---|
| `room:created` { code } | Sala creada |
| `room:state` { players } | Estado de la sala |
| `game:started` { hand, ... } | Partida iniciada |
| `game:state` { hand, handCounts, ... } | Estado de juego (broadcast individual) |
| `game:invalid` { reason } | Movimiento inválido |
| `game:ended` { winnerId } | Partida terminada |
| `player:disconnected` | Jugador desconectado |

## Fases de desarrollo

| # | Fase | Estado |
|---|---|---|
| 0 | Setup monorepo + dependencias | ✅ |
| 1 | `@uno/shared`: tipos, mazo, reglas + tests | ✅ |
| 2 | `@uno/server`: RoomManager, GameRoom + Socket.IO | ✅ |
| 3 | `@uno/client`: Home, Lobby (crear/unirse a sala) | ✅ |
| 4 | `@uno/client`: tablero (cartas, mano, jugadas, Wild) | ✅ |
| 5 | UX: UNO!, call-out, notificaciones | ✅ |
| 6 | Server: rate-limit + validación de inputs + esbozo E2E | ✅ |
| 7 | Dockerfiles + docker-compose (nginx + server) | ✅ |

## Cómo ejecutar

## Despliegue con Docker

```bash
docker compose up --build
```

- Cliente: `http://localhost:80`
- Servidor (WebSocket): `ws://localhost:3000/socket.io`

## Archivos clave

| Archivo | Propósito |
|---|---|
| `packages/shared/src/rules.ts` | Toda la lógica del juego (funciones puras) |
| `packages/server/src/GameRoom.ts` | Máquina de estados del juego (autoridad) |
| `packages/server/src/rateLimiter.ts` | Rate-limiting por socket |
| `packages/client/src/store.ts` | Estado del cliente (Zustand) |
| `packages/client/src/pages/Game.tsx` | Tablero de juego |
| `PLAN.md` | Este documento |

## Cómo ejecutar

### Desarrollo

```bash
pnpm install
pnpm dev          # servidor + cliente en paralelo
pnpm test         # tests unitarios (19 tests)
pnpm test:e2e     # tests de integración (opcional)
pnpm build        # build producción
```

### Producción

```bash
docker compose up --build
```

- Servidor: `http://localhost:3000`
- Cliente: `http://localhost:5173` (dev, con proxy a /socket.io)
