import { Card, Color, GameState, Player, Direction } from './types.js'

export function canPlayCard(card: Card, topCard: Card, activeColor: Color, pendingDraws: number): boolean {
  if (pendingDraws > 0) return false
  if (card.color === Color.Wild) return true
  if (card.color === activeColor) return true
  if (card.kind === topCard.kind) {
    if (card.kind === 'number' && topCard.kind === 'number') return card.value === topCard.value
    return true
  }
  return false
}

export function isValidMove(
  card: Card,
  topCard: Card,
  activeColor: Color,
  pendingDraws: number,
  chosenColor?: Color,
): boolean {
  if (card.color === Color.Wild) {
    if (!chosenColor || chosenColor === Color.Wild) return false
    return true
  }
  return canPlayCard(card, topCard, activeColor, pendingDraws)
}

export function createPlayer(id: string, name: string): Player {
  return { id, name, hand: [], saidUno: false, isConnected: true }
}

export function dealCards(deck: Card[], count: number): { dealt: Card[]; remaining: Card[] } {
  return { dealt: deck.slice(0, count), remaining: deck.slice(count) }
}

export function drawCards(deck: Card[], count: number, discardPile: Card[]): { drawn: Card[]; deck: Card[] } {
  let d = [...deck]
  const drawn: Card[] = []
  for (let i = 0; i < count; i++) {
    if (d.length === 0) {
      if (discardPile.length <= 1) break
      // Reshuffle: el discard (excepto la carta superior) se convierte en el nuevo mazo.
      // La carta superior permanece en el discard pile — NO se agrega al mazo.
      d = shuffle(discardPile.slice(0, -1))
    }
    drawn.push(d.pop()!)
  }
  return { drawn, deck: d }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function applyCardEffect(
  card: Card,
  state: GameState,
  chosenColor?: Color,
): Pick<GameState, 'direction' | 'currentPlayerIndex' | 'pendingDraws' | 'activeColor'> {
  let direction: Direction = state.direction
  let currentPlayerIndex = state.currentPlayerIndex
  let pendingDraws = state.pendingDraws
  let activeColor = chosenColor ?? card.color

  const playerCount = state.players.length

  const advance = (steps: number) => {
    const total = direction * steps
    currentPlayerIndex = ((currentPlayerIndex + total) % playerCount + playerCount) % playerCount
  }

  const nextTurn = () => advance(1)

  switch (card.kind) {
    case 'skip':
      advance(2)
      break
    case 'reverse':
      direction = (direction * -1) as Direction
      if (playerCount === 2) {
        advance(2)
      } else {
        advance(1)
      }
      break
    case 'draw2':
      pendingDraws += 2
      nextTurn()
      break
    case 'wild4':
      pendingDraws += 4
      nextTurn()
      break
    case 'wild':
      activeColor = chosenColor!
      advance(1)
      break
    case 'number':
    default:
      advance(1)
      break
  }

  return { direction, currentPlayerIndex, pendingDraws, activeColor }
}
