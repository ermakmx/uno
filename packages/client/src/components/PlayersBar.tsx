import { useState } from 'react'
import { useGameStore } from '../store'

export default function PlayersBar() {
  const players = useGameStore(s => s.players)
  const playerId = useGameStore(s => s.playerId)
  const currentPlayerId = useGameStore(s => s.currentPlayerId)
  const handCounts = useGameStore(s => s.handCounts)
  const callOut = useGameStore(s => s.callOut)
  const [pendingTarget, setPendingTarget] = useState<string | null>(null)

  return (
    <div className="fixed top-12 sm:top-16 right-2 sm:right-4 space-y-1.5 sm:space-y-2 z-30 max-w-[45vw] sm:max-w-none">
      {players.map(p => {
        const isCurrent = p.id === currentPlayerId
        const isMe = p.id === playerId
        const playerHandCount = handCounts[p.id] ?? p.handCount
        const canCallOut = !isMe && playerHandCount === 1 && !p.saidUno

        return (
          <div
            key={p.id}
            className={`
              flex items-center gap-1.5 sm:gap-2.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-sm
              transition-all duration-500
              ${isCurrent
                ? 'bg-yellow-500/15 border border-yellow-500/40 shadow-lg shadow-yellow-500/5'
                : 'bg-gray-800/60 border border-transparent'
              }
              ${isMe ? 'ring-1 ring-green-500/50' : ''}
            `}
          >
            {/* Avatar dot */}
            <div className="relative">
              <div
                className={`
                  w-2.5 h-2.5 rounded-full transition-all duration-500
                  ${isMe ? 'bg-green-500' : 'bg-gray-500'}
                  ${isCurrent ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-gray-900' : ''}
                `}
              />
              {isCurrent && (
                <span className="absolute -inset-1 rounded-full animate-ping bg-yellow-400/20" />
              )}
            </div>

            {/* Name + uno indicator */}
            <div className="flex flex-col leading-tight">
              <span className={`${isMe ? 'font-bold' : ''} ${isCurrent ? 'text-yellow-300' : ''}`}>
                {p.name}
                {isMe && <span className="text-gray-400 font-normal ml-1">(tú)</span>}
              </span>
              {playerHandCount === 1 && p.saidUno && (
                <span className="text-[10px] text-green-400 font-semibold">UNO ✓</span>
              )}
              {playerHandCount === 1 && !p.saidUno && (
                <span className="text-[10px] text-red-400 font-semibold">¡UNO!</span>
              )}
            </div>

            {/* Card count */}
            <span className={`text-xs ml-auto tabular-nums ${isCurrent ? 'text-yellow-400' : 'text-gray-500'}`}>
              {playerHandCount}
            </span>

            {/* Call out button */}
            {canCallOut && (
              <button
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                  pendingTarget === p.id
                    ? 'bg-red-400 cursor-wait'
                    : 'bg-red-600/80 hover:bg-red-600'
                }`}
                onClick={() => {
                  if (pendingTarget) return
                  setPendingTarget(p.id)
                  setTimeout(() => {
                    callOut(p.id)
                    setPendingTarget(null)
                  }, 500)
                }}
              >
                {pendingTarget === p.id ? '...' : 'UNO'}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
