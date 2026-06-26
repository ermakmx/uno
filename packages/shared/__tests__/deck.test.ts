import { describe, it, expect } from 'vitest'
import { createDeck, shuffle } from '../src/deck'
import { Card, Color } from '../src/types'

describe('createDeck', () => {
  it('should contain 108 cards', () => {
    const deck = createDeck()
    expect(deck.length).toBe(108)
  })

  it('should have exactly 4 wild cards and 4 wild4 cards', () => {
    const deck = createDeck()
    const wild = deck.filter(c => c.kind === 'wild')
    const wild4 = deck.filter(c => c.kind === 'wild4')
    expect(wild).toHaveLength(4)
    expect(wild4).toHaveLength(4)
  })

  it('should have 25 cards per color', () => {
    const deck = createDeck()
    for (const color of [Color.Red, Color.Yellow, Color.Green, Color.Blue]) {
      const colored = deck.filter(c => c.color === color)
      expect(colored).toHaveLength(25)
    }
  })
})

describe('shuffle', () => {
  it('should return all elements', () => {
    const arr = [1, 2, 3, 4, 5]
    const shuffled = shuffle(arr)
    expect(shuffled).toHaveLength(arr.length)
    expect(shuffled.sort()).toEqual(arr.sort())
  })

  it('should not mutate original', () => {
    const arr = [1, 2, 3]
    const copy = [...arr]
    shuffle(arr)
    expect(arr).toEqual(copy)
  })
})
