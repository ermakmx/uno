import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../store'
import { Color, canPlayCard } from '@uno/shared'
import CardView from '../components/CardView'
import CardBack from '../components/CardBack'
import PlayersBar from '../components/PlayersBar'
import TurnIndicator from '../components/TurnIndicator'
import ColorPicker from '../components/ColorPicker'

export default function Game() {
  const hand = useGameStore(s => s.hand)
  const players = useGameStore(s => s.players)
  const topCard = useGameStore(s => s.topCard)
  const activeColor = useGameStore(s => s.activeColor)
  const currentPlayerId = useGameStore(s => s.currentPlayerId)
  const playerId = useGameStore(s => s.playerId)
  const pendingDraws = useGameStore(s => s.pendingDraws)
  const deckCount = useGameStore(s => s.deckCount)
  const showColorPicker = useGameStore(s => s.showColorPicker)
  const drawnCardThisTurn = useGameStore(s => s.drawnCardThisTurn)
  const playCard = useGameStore(s => s.playCard)
  const drawCard = useGameStore(s => s.drawCard)
  const passDraw = useGameStore(s => s.passDraw)
  const sayUno = useGameStore(s => s.sayUno)

  const isMyTurn = currentPlayerId === playerId
  const myUnoStatus = players.find(p => p.id === playerId)
  const hasOneCard = hand.length === 1
  const needsToSayUno = hasOneCard && !myUnoStatus?.saidUno

  // Detect newly drawn cards and animate them dropping into the hand.
  const prevLen = useRef(hand.length)
  const [newIndices, setNewIndices] = useState<Set<number>>(new Set())
  useEffect(() => {
    const oldLen = prevLen.current
    prevLen.current = hand.length
    if (hand.length > oldLen) {
      const added = Array.from(
        { length: hand.length - oldLen },
        (_, i) => oldLen + i,
      )
      setNewIndices(new Set(added))
      const timer = setTimeout(() => setNewIndices(new Set()), 750)
      return () => clearTimeout(timer)
    }
  }, [hand.length])

  // ── Drag & drop ──────────────────────────────────────────────────
  /** Tracks which card is being interacted with (drag or click). */
  const dragRef = useRef<{ index: number; startX: number; startY: number } | null>(null)
  /** Position of the floating card; null = no drag visual (click was cancelled). */
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const [overDiscard, setOverDiscard] = useState(false)

  const DRAG_THRESHOLD = 8

  function cardPlayable(i: number) {
    return topCard && isMyTurn && canPlayCard(hand[i], topCard, activeColor, pendingDraws)
  }

  function onCardMouseDown(i: number, e: React.MouseEvent) {
    if (!cardPlayable(i)) return
    e.preventDefault()
    dragRef.current = { index: i, startX: e.clientX, startY: e.clientY }
  }

  function onCardTouchStart(i: number, e: React.TouchEvent) {
    if (!cardPlayable(i)) return
    const t = e.touches[0]
    dragRef.current = { index: i, startX: t.clientX, startY: t.clientY }
  }

  useEffect(() => {
    function onMove(e: MouseEvent | TouchEvent) {
      const ref = dragRef.current
      if (!ref) return
      const p = 'touches' in e ? e.touches[0] : e
      const dx = p.clientX - ref.startX
      const dy = p.clientY - ref.startY
      const dragged = Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD
      if (dragged) {
        setDragPos({ x: p.clientX, y: p.clientY })
        const el = document.getElementById('discard-zone')
        if (el) {
          const r = el.getBoundingClientRect()
          setOverDiscard(p.clientX >= r.left && p.clientX <= r.right && p.clientY >= r.top && p.clientY <= r.bottom)
        }
      }
    }
    function onUp(e: MouseEvent | TouchEvent) {
      if (!dragRef.current) return
      const idx = dragRef.current.index
      const p = 'changedTouches' in e ? e.changedTouches[0] : e
      const dx = p.clientX - dragRef.current.startX
      const dy = p.clientY - dragRef.current.startY
      const dragged = Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD
      dragRef.current = null
      setDragPos(null)
      setOverDiscard(false)
      if (dragged) {
        const el = document.getElementById('discard-zone')
        if (el) {
          const r = el.getBoundingClientRect()
          if (p.clientX >= r.left && p.clientX <= r.right && p.clientY >= r.top && p.clientY <= r.bottom) {
            playCard(idx)
          }
        }
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [playCard])

  return (
    <div className="flex-1 flex flex-col relative select-none">
      <PlayersBar />
      <TurnIndicator />

      {/* UNO! prompt when you need to say it */}
      {needsToSayUno && (
        <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
          <button
            className="pointer-events-auto px-10 py-4 rounded-2xl bg-red-600 hover:bg-red-500 font-black text-3xl tracking-widest shadow-2xl shadow-red-600/40 animate-pulse transition"
            onClick={sayUno}
          >
            ¡UNO!
          </button>
        </div>
      )}

      {/* Center: Discard pile + Draw pile */}
      <div
        id="discard-zone"
        className={`flex-1 flex items-center justify-center gap-4 sm:gap-8 transition-all duration-300
          ${overDiscard ? 'ring-4 ring-yellow-400 rounded-3xl bg-yellow-500/5 scale-[1.02]' : ''}`}
      >
        {/* Draw pile */}
        <div className="flex flex-col items-center gap-1">
          <div data-testid="draw-pile" onClick={isMyTurn && !drawnCardThisTurn ? drawCard : undefined}>
            <CardBack count={pendingDraws > 0 ? pendingDraws : undefined} />
          </div>
          {deckCount > 0 && (
            <span className="text-[10px] sm:text-sm text-gray-400 tabular-nums bg-gray-800 px-1.5 sm:px-2 py-0.5 rounded-md font-semibold">
              {deckCount}
            </span>
          )}
        </div>

        {/* Active color indicator */}
        {activeColor !== Color.Wild && (
          <div
            className={`
              w-4 h-4 sm:w-6 sm:h-6 rounded-full border-2 border-white/50
              ${activeColor === Color.Red ? 'bg-red-600' : ''}
              ${activeColor === Color.Blue ? 'bg-blue-600' : ''}
              ${activeColor === Color.Green ? 'bg-green-600' : ''}
              ${activeColor === Color.Yellow ? 'bg-yellow-500' : ''}
            `}
          />
        )}

        {/* Discard pile */}
        {topCard && (
          <div className="relative">
            <CardView card={topCard} disabled />
            {drawnCardThisTurn && topCard && (
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs text-yellow-400 whitespace-nowrap">
                Juega la carta robada o pasa
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hand */}
      <div className="px-1 sm:px-2 pb-4">
        <div className="flex flex-wrap justify-center gap-0.5 sm:gap-1 gap-y-1 sm:gap-y-1.5 py-2 max-w-full mx-auto"
          style={{ maxWidth: hand.length > 12 ? 'min(48rem, 98vw)' : '100%' }}>
          {hand.map((card, i) => {
            const playable = cardPlayable(i)
            const sizeClass = hand.length <= 8 ? '' :
              hand.length <= 12 ? 'w-11 h-16 sm:w-14 sm:h-20' :
              hand.length <= 16 ? 'w-9 h-[54px] sm:w-12 sm:h-[72px]' :
              hand.length <= 22 ? 'w-8 h-12 sm:w-10 sm:h-[60px]' :
              'w-7 h-10 sm:w-8 sm:h-12'
            const anim = newIndices.has(i) ? 'animate-drop-in' : ''
            return (
              <CardView
                key={`${card.kind}-${card.color}-${'value' in card ? card.value : ''}-${i}`}
                card={card}
                disabled={!playable}
                className={`${sizeClass} ${anim} ${playable ? 'ring-2 ring-yellow-400/80 shadow-lg shadow-yellow-400/40' : ''}`}
                onDoubleClick={playable ? () => playCard(i) : undefined}
                onMouseDown={playable ? (e) => onCardMouseDown(i, e) : undefined}
                onTouchStart={playable ? (e) => onCardTouchStart(i, e) : undefined}
              />
            )
          })}
        </div>
      </div>

      {/* Floating card while dragging */}
      {dragPos && dragRef.current !== null && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            left: dragPos.x - 32,
            top: dragPos.y - 48,
            transform: 'rotate(-12deg) scale(1.15)',
            filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.6))',
          }}
        >
          <CardView card={hand[dragRef.current!.index]} small />
        </div>
      )}

      {/* Action buttons */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
        {isMyTurn && drawnCardThisTurn && (
          <button
            className="px-6 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 font-bold transition"
            onClick={passDraw}
          >
            Pasar
          </button>
        )}
      </div>

      {/* Error toast */}
      <ErrorToast />

      {/* Color picker modal */}
      {showColorPicker && <ColorPicker />}
    </div>
  )
}

function ErrorToast() {
  const error = useGameStore(s => s.error)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (error) {
      setVisible(true)
      const timer = setTimeout(() => setVisible(false), 2500)
      return () => clearTimeout(timer)
    }
  }, [error])

  if (!visible || !error) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg shadow-xl z-50">
      {error}
    </div>
  )
}
