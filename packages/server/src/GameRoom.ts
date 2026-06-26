import {
  Card,
  Color,
  GameState,
  Player,
  Direction,
  PlayerPublic,
  GameStartedPayload,
  GameStatePayload,
} from '@uno/shared'
import { createDeck, shuffle } from '@uno/shared'
import { createPlayer, dealCards, drawCards, isValidMove, applyCardEffect } from '@uno/shared'

function cardScore(card: Card): number {
  switch (card.kind) {
    case 'number': return card.value
    case 'skip':
    case 'reverse':
    case 'draw2': return 20
    case 'wild':
    case 'wild4': return 50
  }
}

export class GameRoom {
  code: string
  isPublic: boolean
  state: GameState
  onStateChange?: (code: string) => void
  turnTimeoutMs = 5000

  private turnTimer: ReturnType<typeof setTimeout> | null = null
  private hasDrawnThisTurn = false
  turnStartedAt: number = Date.now()

  constructor(code: string, isPublic = false) {
    this.code = code
    this.isPublic = isPublic
    this.state = {
      players: [],
      deck: [],
      discardPile: [],
      activeColor: Color.Red,
      direction: 1,
      currentPlayerIndex: 0,
      pendingDraws: 0,
      phase: 'waiting',
    }
  }

  private startTurnTimer(hasDrawn = false) {
    this.clearTurnTimer()
    this.hasDrawnThisTurn = hasDrawn
    this.turnStartedAt = Date.now()
    this.turnTimer = setTimeout(() => this.handleTurnTimeout(), this.turnTimeoutMs)
  }

  private clearTurnTimer() {
    if (this.turnTimer !== null) {
      clearTimeout(this.turnTimer)
      this.turnTimer = null
    }
  }

  private handleTurnTimeout() {
    if (this.state.phase !== 'playing') return
    const playerId = this.state.players[this.state.currentPlayerIndex]?.id
    if (!playerId) return

    if (!this.hasDrawnThisTurn) {
      const result = this.drawCard(playerId)
      if (!result.success) return
      if (result.gameEnded) {
        this.onStateChange?.(this.code)
        return
      }
      const currentPlayer = this.state.players[this.state.currentPlayerIndex]
      if (currentPlayer?.id === playerId) {
        this.advanceTurn()
      }
    } else {
      this.passDraw(playerId)
    }

    this.onStateChange?.(this.code)
  }

  addPlayer(id: string, name: string) {
    if (this.state.players.length >= 10) return
    if (this.state.players.find(p => p.id === id)) return
    this.state.players.push(createPlayer(id, name))
  }

  getPublicPlayers(): PlayerPublic[] {
    return this.state.players.map(p => ({
      id: p.id,
      name: p.name,
      handCount: p.hand.length,
      saidUno: p.saidUno,
    }))
  }

  getRoomInfo(): { code: string; hostName: string; playerCount: number } | null {
    if (!this.isPublic || this.state.phase !== 'waiting') return null
    const host = this.state.players[0]
    if (!host) return null
    return {
      code: this.code,
      hostName: host.name,
      playerCount: this.state.players.length,
    }
  }

  getConnectedPlayerIds(): string[] {
    return this.state.players.filter(p => p.isConnected).map(p => p.id)
  }

  getPlayerHand(playerId: string): Card[] {
    const player = this.state.players.find(p => p.id === playerId)
    return player ? [...player.hand] : []
  }

  startGame(): { success: true; payload: GameStartedPayload } | { success: false; error: string } {
    if (this.state.players.length < 2) return { success: false, error: 'Need at least 2 players' }
    if (this.state.phase !== 'waiting') return { success: false, error: 'Game already started' }

    const deck = shuffle(createDeck())
    const { dealt, remaining } = dealCards(deck, this.state.players.length * 7)

    for (let i = 0; i < this.state.players.length; i++) {
      this.state.players[i].hand = dealt.slice(i * 7, (i + 1) * 7)
    }

    let discardTop: Card | undefined
    let remainingDeck = [...remaining]
    do {
      if (remainingDeck.length === 0) throw new Error('No valid starting card')
      discardTop = remainingDeck.pop()!
    } while (discardTop.color === Color.Wild)

    this.state.deck = remainingDeck
    this.state.discardPile = [discardTop]
    this.state.activeColor = discardTop.color
    this.state.direction = 1
    this.state.currentPlayerIndex = 0
    this.state.pendingDraws = 0
    this.state.phase = 'playing'

    for (const p of this.state.players) {
      p.saidUno = false
    }

    this.startTurnTimer()

    const firstPlayer = this.state.players[0]
    const payload: GameStartedPayload = {
      hand: [...firstPlayer.hand],
      topCard: discardTop,
      activeColor: this.state.activeColor,
      currentPlayerId: firstPlayer.id,
      direction: 1,
      players: this.getPublicPlayers(),
      deckCount: this.state.deck.length,
      turnStartedAt: this.turnStartedAt,
    }
    return { success: true, payload }
  }

  playCard(
    playerId: string,
    cardIndex: number,
    chosenColor?: string,
  ): { success: true; gameEnded: boolean; winnerId?: string; winnerName?: string } | { success: false; error: string } {
    if (this.state.phase !== 'playing') return { success: false, error: 'Game not in progress' }

    const playerIndex = this.state.players.findIndex(p => p.id === playerId)
    if (playerIndex === -1) return { success: false, error: 'Player not found' }
    if (playerIndex !== this.state.currentPlayerIndex) return { success: false, error: 'Not your turn' }

    const player = this.state.players[playerIndex]
    if (cardIndex < 0 || cardIndex >= player.hand.length) return { success: false, error: 'Invalid card index' }

    const card = player.hand[cardIndex]
    const topCard = this.state.discardPile[this.state.discardPile.length - 1]
    const color = chosenColor as Color | undefined

    if (!isValidMove(card, topCard, this.state.activeColor, this.state.pendingDraws, color)) {
      return { success: false, error: 'Invalid move' }
    }

    player.hand.splice(cardIndex, 1)
    this.state.discardPile.push(card)

    player.saidUno = false

    const effects = applyCardEffect(card, this.state, color)
    this.state.direction = effects.direction
    this.state.currentPlayerIndex = effects.currentPlayerIndex
    this.state.pendingDraws = effects.pendingDraws
    this.state.activeColor = effects.activeColor

    if (player.hand.length === 0) {
      this.state.phase = 'finished'
      this.clearTurnTimer()
      this.state.winnerId = playerId
      return { success: true, gameEnded: true, winnerId: playerId, winnerName: player.name }
    }

    this.startTurnTimer()
    return { success: true, gameEnded: false }
  }

  drawCard(
    playerId: string,
  ): { success: true; gameEnded: boolean; winnerId?: string; winnerName?: string } | { success: false; error: string } {
    if (this.state.phase !== 'playing') return { success: false, error: 'Game not in progress' }

    const playerIndex = this.state.players.findIndex(p => p.id === playerId)
    if (playerIndex === -1) return { success: false, error: 'Player not found' }
    if (playerIndex !== this.state.currentPlayerIndex) return { success: false, error: 'Not your turn' }

    const player = this.state.players[playerIndex]
    const topCard = this.state.discardPile[this.state.discardPile.length - 1]
    const activeColor = this.state.activeColor

    // Forced draw from a draw penalty (+2 / +4): draw all pending and end turn.
    if (this.state.pendingDraws > 0) {
      const { drawn, deck } = drawCards(this.state.deck, this.state.pendingDraws, this.state.discardPile)
      this.state.deck = deck
      player.hand.push(...drawn)
      this.state.pendingDraws = 0
      player.saidUno = false
      // If deck is now empty, check end game (lowest sum)
      if (this.state.deck.length === 0 && this.state.discardPile.length <= 1) {
        return this.endDeckEmpty()
      }
      this.advanceTurn()
      return { success: true, gameEnded: false }
    }

    // Normal draw: robas una sola carta.
    // Si es jugable, el jugador decide (jugar o pasar).
    // Si no es jugable, se queda en la mano y el turno avanza.
    const { drawn, deck } = drawCards(this.state.deck, 1, this.state.discardPile)
    this.state.deck = deck

    // Deck vacía tras intentar robar → fin por puntaje menor
    if (drawn.length === 0) {
      return this.endDeckEmpty()
    }

    const cardArr = drawn[0]
    player.hand.push(cardArr)
    player.saidUno = false

    if (canPlayWithoutEffect(cardArr, topCard, activeColor)) {
      // La carta robada es jugable — el jugador elige (jugar o Pasar),
      // por eso no avanzamos el turno.
      this.hasDrawnThisTurn = true
      this.startTurnTimer(true)
      return { success: true, gameEnded: false }
    }

    // No es jugable → avanza el turno automáticamente
    this.advanceTurn()
    return { success: true, gameEnded: false }
  }

  private endDeckEmpty(): { success: true; gameEnded: boolean; winnerId: string; winnerName: string } {
    const connected = this.state.players.filter(p => p.isConnected)
    if (connected.length === 0) {
      return { success: true, gameEnded: false, winnerId: '', winnerName: '' }
    }
    const best = connected
      .map(p => ({ playerId: p.id, name: p.name, total: p.hand.reduce((s, c) => s + cardScore(c), 0) }))
      .reduce((a, b) => (a.total <= b.total ? a : b))
    this.state.phase = 'finished'
    this.state.winnerId = best.playerId
    return { success: true, gameEnded: true, winnerId: best.playerId, winnerName: best.name }
    return { success: true, gameEnded: true, winnerId: best.playerId, winnerName: best.name }
  }

  passDraw(playerId: string): { success: true } | { success: false; error: string } {
    if (this.state.phase !== 'playing') return { success: false, error: 'Game not in progress' }

    const playerIndex = this.state.players.findIndex(p => p.id === playerId)
    if (playerIndex === -1) return { success: false, error: 'Player not found' }
    if (playerIndex !== this.state.currentPlayerIndex) return { success: false, error: 'Not your turn' }

    this.advanceTurn()
    this.state.pendingDraws = 0

    return { success: true }
  }

  private advanceTurn() {
    const playerCount = this.state.players.length
    this.state.currentPlayerIndex = ((this.state.currentPlayerIndex + this.state.direction) % playerCount + playerCount) % playerCount
    this.startTurnTimer()
  }

  sayUno(playerId: string) {
    const player = this.state.players.find(p => p.id === playerId)
    if (player) player.saidUno = true
  }

  callOut(callerId: string, targetId: string) {
    const target = this.state.players.find(p => p.id === targetId)
    if (!target || target.hand.length !== 1) return
    if (target.saidUno) return

    const { drawn, deck } = drawCards(this.state.deck, 2, this.state.discardPile)
    this.state.deck = deck
    target.hand.push(...drawn)
  }

  disconnectPlayer(playerId: string) {
    const player = this.state.players.find(p => p.id === playerId)
    if (player) player.isConnected = false
  }

  resetToLobby() {
    this.state.deck = []
    this.state.discardPile = []
    this.state.direction = 1
    this.state.currentPlayerIndex = 0
    this.state.pendingDraws = 0
    this.state.phase = 'waiting'
    this.state.winnerId = undefined
    for (const p of this.state.players) {
      p.hand = []
      p.saidUno = false
    }
  }

  getStatePayload(): Omit<GameStatePayload, 'hand'> {
    const currentPlayer = this.state.players[this.state.currentPlayerIndex]
    return {
      topCard: this.state.discardPile[this.state.discardPile.length - 1],
      activeColor: this.state.activeColor,
      currentPlayerId: currentPlayer?.id ?? '',
      direction: this.state.direction,
      players: this.getPublicPlayers(),
      handCounts: Object.fromEntries(this.state.players.map(p => [p.id, p.hand.length])),
      pendingDraws: this.state.pendingDraws,
      winnerId: this.state.winnerId,
      deckCount: this.state.deck.length,
      turnStartedAt: this.turnStartedAt,
    }
  }
}

function canPlayWithoutEffect(card: Card, topCard: Card, activeColor: Color): boolean {
  if (card.color === Color.Wild) return true
  if (card.color === activeColor) return true
  if (card.kind === 'number' && topCard.kind === 'number' && card.value === topCard.value) return true
  if (card.kind !== 'number' && topCard.kind !== 'number' && card.kind === topCard.kind) return true
  return false
}
