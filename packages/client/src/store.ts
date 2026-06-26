import { create } from 'zustand'
import {
  Card,
  Color,
  Direction,
  PlayerPublic,
  PublicRoomEntry,
  RoomCreatedPayload,
  RoomStatePayload,
  GameStartedPayload,
  GameStatePayload,
  GameEndedPayload,
  InvalidMovePayload,
  ClientEvent,
  ServerEvent,
} from '@uno/shared'
import { getSocket } from './socket'

export type Page = 'home' | 'lobby' | 'game' | 'ended'

type GameStore = {
  page: Page
  playerName: string
  roomCode: string
  playerId: string
  players: PlayerPublic[]
  hand: Card[]
  topCard: Card | null
  activeColor: Color
  currentPlayerId: string
  direction: Direction
  handCounts: Record<string, number>
  pendingDraws: number
  winnerId?: string
  winnerName?: string
  error: string | null
  showColorPicker: boolean
  pendingWildIndex: number | null
  drawnCardThisTurn: boolean
  publicRooms: PublicRoomEntry[]
  deckCount: number
  turnStartedAt: number

  setPlayerName: (name: string) => void
  createRoom: (isPublic?: boolean) => void
  joinRoom: (code: string) => void
  startGame: () => void
  playCard: (cardIndex: number, chosenColor?: Color) => void
  drawCard: () => void
  passDraw: () => void
  sayUno: () => void
  callOut: (targetId: string) => void
  setShowColorPicker: (show: boolean) => void
  fetchPublicRooms: () => void
  reset: () => void
  rematch: () => void
}

export const useGameStore = create<GameStore>((set, get) => {
  const socket = getSocket()

  socket.on(ServerEvent.RoomCreated, (data: RoomCreatedPayload) => {
    set({ roomCode: data.code, page: 'lobby', error: null })
  })

  socket.on(ServerEvent.RoomState, (data: RoomStatePayload) => {
    const { page } = get()
    if (page === 'ended') {
      set({ players: data.players, page: 'lobby', hand: [], topCard: null, pendingDraws: 0, error: null })
    } else {
      set({ players: data.players, error: null })
    }
  })

  socket.on(ServerEvent.GameStarted, (data: GameStartedPayload) => {
    set({
      page: 'game',
      hand: data.hand,
      topCard: data.topCard,
      activeColor: data.activeColor,
      currentPlayerId: data.currentPlayerId,
      direction: data.direction,
      players: data.players,
      handCounts: Object.fromEntries(data.players.map(p => [p.id, p.handCount])),
      pendingDraws: 0,
      drawnCardThisTurn: false,
      deckCount: data.deckCount,
      turnStartedAt: data.turnStartedAt,
      error: null,
    })
  })

  socket.on(ServerEvent.GameState, (data: GameStatePayload) => {
    const prev = get().currentPlayerId
    const turnChanged = prev !== data.currentPlayerId
    // Keep drawnCardThisTurn only while it's still our turn after drawing
    // a playable card (server does not advance in that case).
    let drawnCardThisTurn = false
    if (!turnChanged && get().drawnCardThisTurn) {
      drawnCardThisTurn = data.pendingDraws === 0 && data.currentPlayerId === get().playerId
    }
    set({
      hand: data.hand,
      topCard: data.topCard,
      activeColor: data.activeColor,
      currentPlayerId: data.currentPlayerId,
      direction: data.direction,
      players: data.players,
      handCounts: data.handCounts,
      pendingDraws: data.pendingDraws,
      deckCount: data.deckCount,
      turnStartedAt: data.turnStartedAt,
      error: null,
      drawnCardThisTurn,
    })
  })

  socket.on(ServerEvent.GameEnded, (data: GameEndedPayload) => {
    set({
      page: 'ended',
      winnerId: data.winnerId,
      winnerName: data.winnerName,
    })
  })

  socket.on(ServerEvent.InvalidMove, (data: InvalidMovePayload) => {
    set({ error: data.reason })
  })

  socket.on(ServerEvent.PublicRoomsUpdated, (rooms: PublicRoomEntry[]) => {
    set({ publicRooms: rooms })
  })

  socket.on('connect', () => {
    const { playerId } = get()
    if (!playerId) {
      set({ playerId: socket.id ?? '' })
    }
    // Request public rooms on reconnect
    get().fetchPublicRooms()
  })

  return {
    page: 'home',
    playerName: '',
    roomCode: '',
    playerId: '',
    players: [],
    hand: [],
    topCard: null,
    activeColor: Color.Red,
    currentPlayerId: '',
    direction: 1,
    handCounts: {},
    pendingDraws: 0,
    error: null,
    showColorPicker: false,
    pendingWildIndex: null,
    drawnCardThisTurn: false,
    publicRooms: [],
    deckCount: 0,
    turnStartedAt: 0,

    setPlayerName: (name) => set({ playerName: name }),

    createRoom: (isPublic = false) => {
      const { playerName } = get()
      if (!playerName.trim()) return
      if (socket.id) set({ playerId: socket.id })
      socket.emit(ClientEvent.CreateRoom, { name: playerName.trim(), isPublic })
      set({ playerName: playerName.trim() })
    },

    joinRoom: (code) => {
      const { playerName } = get()
      if (!playerName.trim() || !code.trim()) return
      if (socket.id) set({ playerId: socket.id })
      socket.emit(ClientEvent.JoinRoom, { code: code.trim().toUpperCase(), name: playerName.trim() }, (err?: string) => {
        if (err) {
          set({ error: err })
        } else {
          set({ roomCode: code.trim().toUpperCase(), page: 'lobby', error: null, playerName: playerName.trim() })
        }
      })
    },

    startGame: () => {
      socket.emit(ClientEvent.StartGame)
    },

    playCard: (cardIndex, chosenColor) => {
      const card = get().hand[cardIndex]
      if (!card) return
      if (card.color === Color.Wild && !chosenColor) {
        if (get().drawnCardThisTurn) set({ drawnCardThisTurn: false })
        set({ showColorPicker: true, pendingWildIndex: cardIndex })
        return
      }
      socket.emit(ClientEvent.PlayCard, { cardIndex, chosenColor })
      set({ drawnCardThisTurn: false })
    },

    setShowColorPicker: (show) => set({ showColorPicker: show }),

    drawCard: () => {
      socket.emit(ClientEvent.DrawCard)
      set({ drawnCardThisTurn: true })
    },

    passDraw: () => {
      socket.emit(ClientEvent.PassDraw)
    },

    sayUno: () => {
      socket.emit(ClientEvent.SayUno)
    },

    callOut: (targetId) => {
      socket.emit(ClientEvent.CallOut, { targetId })
    },

    fetchPublicRooms: () => {
      socket.emit(ClientEvent.ListPublicRooms, (rooms: PublicRoomEntry[]) => {
        set({ publicRooms: rooms })
      })
    },

    reset: () => {
      set({
        page: 'home',
        roomCode: '',
        players: [],
        hand: [],
        topCard: null,
        activeColor: Color.Red,
        currentPlayerId: '',
        direction: 1,
        handCounts: {},
        pendingDraws: 0,
        deckCount: 0,
        turnStartedAt: 0,
        winnerId: undefined,
        winnerName: undefined,
        error: null,
    showColorPicker: false,
    pendingWildIndex: null,
        drawnCardThisTurn: false,
        publicRooms: [],
      })
    },

    rematch: () => {
      socket.emit(ClientEvent.Rematch)
    },
  }
})
