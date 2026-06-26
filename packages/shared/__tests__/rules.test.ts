import { describe, it, expect } from 'vitest'
import { canPlayCard, isValidMove, applyCardEffect, createPlayer, dealCards } from '../src/rules'
import { Card, Color, GameState, Direction } from '../src/types'

function card(kind: Card['kind'], color: Color, value?: number): Card {
  if (kind === 'number') return { kind, color: color as Exclude<Color, Color.Wild>, value: value! } as Card
  if (kind === 'wild' || kind === 'wild4') return { kind, color: Color.Wild } as Card
  return { kind, color: color as Exclude<Color, Color.Wild> } as Card
}

describe('canPlayCard', () => {
  const topRed5 = card('number', Color.Red, 5)
  const wild = card('wild', Color.Wild)
  const wild4 = card('wild4', Color.Wild)
  const red7 = card('number', Color.Red, 7)
  const blue3 = card('number', Color.Blue, 3)
  const blueSkip = card('skip', Color.Blue)

  it('any wild is playable', () => {
    expect(canPlayCard(wild, topRed5, Color.Red, 0)).toBe(true)
    expect(canPlayCard(wild4, topRed5, Color.Red, 0)).toBe(true)
  })

  it('same color is playable', () => {
    expect(canPlayCard(red7, topRed5, Color.Red, 0)).toBe(true)
  })

  it('same number is playable', () => {
    const yellow5 = card('number', Color.Yellow, 5)
    expect(canPlayCard(yellow5, topRed5, Color.Red, 0)).toBe(true)
  })

  it('different color and number is not playable', () => {
    expect(canPlayCard(blue3, topRed5, Color.Red, 0)).toBe(false)
  })

  it('same action type across colors is playable', () => {
    const redSkip = card('skip', Color.Red)
    expect(canPlayCard(blueSkip, redSkip, Color.Red, 0)).toBe(true)
  })

  it('with pending draws, no card is playable (no stacking)', () => {
    expect(canPlayCard(red7, topRed5, Color.Red, 2)).toBe(false)
    expect(canPlayCard(card('draw2', Color.Red), topRed5, Color.Red, 2)).toBe(false)
    expect(canPlayCard(wild4, topRed5, Color.Red, 2)).toBe(false)
    expect(canPlayCard(blue3, topRed5, Color.Red, 2)).toBe(false)
  })
})

describe('isValidMove', () => {
  it('wild card requires chosen color', () => {
    const wild = card('wild', Color.Wild)
    const top = card('number', Color.Red, 5)
    expect(isValidMove(wild, top, Color.Red, 0, Color.Blue)).toBe(true)
    expect(isValidMove(wild, top, Color.Red, 0, undefined)).toBe(false)
  })
})

describe('applyCardEffect', () => {
  function makeState(overrides?: Partial<GameState>): GameState {
    return {
      players: [
        createPlayer('p1', 'Alice'),
        createPlayer('p2', 'Bob'),
        createPlayer('p3', 'Charlie'),
      ],
      deck: [],
      discardPile: [],
      activeColor: Color.Red,
      direction: 1,
      currentPlayerIndex: 0,
      pendingDraws: 0,
      phase: 'playing',
      ...overrides,
    }
  }

  it('number card advances to next player', () => {
    const state = makeState()
    const result = applyCardEffect(card('number', Color.Red, 5), state)
    expect(result.currentPlayerIndex).toBe(1)
    expect(result.direction).toBe(1)
  })

  it('skip card jumps one player', () => {
    const state = makeState()
    const result = applyCardEffect(card('skip', Color.Red), state)
    expect(result.currentPlayerIndex).toBe(2)
  })

  it('reverse flips direction and goes to previous player', () => {
    const state = makeState()
    const result = applyCardEffect(card('reverse', Color.Red), state)
    expect(result.direction).toBe(-1)
    expect(result.currentPlayerIndex).toBe(2)
  })

  it('reverse with 2 players behaves like skip', () => {
    const state = makeState({ players: [createPlayer('p1', 'A'), createPlayer('p2', 'B')] })
    const result = applyCardEffect(card('reverse', Color.Red), state)
    expect(result.currentPlayerIndex).toBe(0)
  })

  it('draw2 adds 2 pending draws', () => {
    const state = makeState()
    const result = applyCardEffect(card('draw2', Color.Red), state)
    expect(result.pendingDraws).toBe(2)
  })
})
