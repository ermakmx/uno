export enum Color {
  Red = 'red',
  Yellow = 'yellow',
  Green = 'green',
  Blue = 'blue',
  Wild = 'wild',
}

export type NumberCard = {
  kind: 'number'
  color: Exclude<Color, Color.Wild>
  value: number // 0-9
}

export type ActionCard = {
  kind: 'skip' | 'reverse' | 'draw2'
  color: Exclude<Color, Color.Wild>
}

export type WildCard = {
  kind: 'wild' | 'wild4'
  color: Color.Wild
}

export type Card = NumberCard | ActionCard | WildCard

export type Player = {
  id: string
  name: string
  hand: Card[]
  saidUno: boolean
  isConnected: boolean
}

export type Direction = 1 | -1

export type GamePhase = 'waiting' | 'playing' | 'finished'

export type GameState = {
  players: Player[]
  deck: Card[]
  discardPile: Card[]
  activeColor: Color
  direction: Direction
  currentPlayerIndex: number
  pendingDraws: number
  phase: GamePhase
  winnerId?: string
}

export type PlayerPublic = {
  id: string
  name: string
  handCount: number
  saidUno: boolean
}

export type PublicRoomEntry = {
  code: string
  hostName: string
  playerCount: number
}

export enum ClientEvent {
  CreateRoom = 'room:create',
  JoinRoom = 'room:join',
  StartGame = 'game:start',
  PlayCard = 'game:play',
  DrawCard = 'game:draw',
  PassDraw = 'game:pass_draw',
  SayUno = 'game:say_uno',
  CallOut = 'game:call_out',
  ListPublicRooms = 'room:list',
  Rematch = 'game:rematch',
}

export enum ServerEvent {
  RoomCreated = 'room:created',
  RoomState = 'room:state',
  GameStarted = 'game:started',
  GameState = 'game:state',
  InvalidMove = 'game:invalid',
  GameEnded = 'game:ended',
  PlayerDisconnected = 'player:disconnected',
  PlayerReconnected = 'player:reconnected',
  PublicRoomList = 'room:list_result',
  PublicRoomsUpdated = 'room:list_updated',
}

export type RoomCreatedPayload = { code: string }
export type RoomStatePayload = { players: PlayerPublic[] }
export type GameStartedPayload = {
  hand: Card[]
  topCard: Card
  activeColor: Color
  currentPlayerId: string
  direction: Direction
  players: PlayerPublic[]
  deckCount: number
  turnStartedAt: number
}
export type GameStatePayload = {
  hand: Card[]
  topCard: Card
  activeColor: Color
  currentPlayerId: string
  direction: Direction
  players: PlayerPublic[]
  handCounts: Record<string, number>
  pendingDraws: number
  winnerId?: string
  deckCount: number
  turnStartedAt: number
}
export type InvalidMovePayload = { reason: string }
export type GameEndedPayload = { winnerId: string; winnerName: string }
