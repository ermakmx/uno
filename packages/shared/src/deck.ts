import { Card, Color } from './types.js'

const PLAY_COLORS: Exclude<Color, Color.Wild>[] = [Color.Red, Color.Yellow, Color.Green, Color.Blue]

function numberedCards(color: Exclude<Color, Color.Wild>): Card[] {
  const cards: Card[] = [{ kind: 'number', color, value: 0 }]
  for (let v = 1; v <= 9; v++) {
    cards.push({ kind: 'number', color, value: v })
    cards.push({ kind: 'number', color, value: v })
  }
  return cards
}

function actionCards(color: Exclude<Color, Color.Wild>): Card[] {
  const kinds = ['skip', 'reverse', 'draw2'] as const
  return kinds.flatMap(k => [{ kind: k as Card['kind'], color } as Card, { kind: k as Card['kind'], color } as Card])
}

function wildCards(): Card[] {
  return Array.from({ length: 4 }, () => ({ kind: 'wild' as const, color: Color.Wild }))
}

function wild4Cards(): Card[] {
  return Array.from({ length: 4 }, () => ({ kind: 'wild4' as const, color: Color.Wild }))
}

export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const c of PLAY_COLORS) {
    deck.push(...numberedCards(c))
    deck.push(...actionCards(c))
  }
  deck.push(...wildCards())
  deck.push(...wild4Cards())
  return deck
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
