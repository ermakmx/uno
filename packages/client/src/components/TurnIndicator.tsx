import { useState, useEffect } from 'react'
import { useGameStore } from '../store'

export default function TurnIndicator() {
  const players = useGameStore(s => s.players)
  const currentPlayerId = useGameStore(s => s.currentPlayerId)
  const playerId = useGameStore(s => s.playerId)
  const direction = useGameStore(s => s.direction)
  const turnStartedAt = useGameStore(s => s.turnStartedAt)

  const current = players.find(p => p.id === currentPlayerId)
  if (!current) return null

  const isMe = currentPlayerId === playerId

  const [timeLeft, setTimeLeft] = useState(10)
  const turnKey = `${currentPlayerId}-${turnStartedAt}`

  useEffect(() => {
    if (!isMe) {
      setTimeLeft(10)
      return
    }
    const update = () => {
      const elapsed = (Date.now() - turnStartedAt) / 1000
      setTimeLeft(Math.max(0, 10 - elapsed))
    }
    update()
    const interval = setInterval(update, 100)
    return () => clearInterval(interval)
  }, [turnKey, isMe, turnStartedAt])

  const urgent = isMe && timeLeft <= 2

  return (
    <div className="fixed top-2 sm:top-4 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-1rem)]">
      <div
        className={`
          flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl
          backdrop-blur-md shadow-lg border
          transition-all duration-500
          ${urgent
            ? 'bg-red-500/20 border-red-500/50 shadow-red-500/15'
            : isMe
            ? 'bg-green-500/15 border-green-500/40 shadow-green-500/10'
            : 'bg-white/5 border-white/10'
          }
        `}
      >
        {/* Direction arrow */}
        <span className="text-base sm:text-lg text-gray-400 select-none">
          {direction === 1 ? '▶' : '◀'}
        </span>

        {/* Current player name & countdown */}
        <span className={`font-bold text-xs sm:text-sm tracking-wide truncate max-w-[180px] sm:max-w-none ${urgent ? 'text-red-400' : isMe ? 'text-green-400' : 'text-white/80'}`}>
          {isMe ? `Tu turno (${Math.ceil(timeLeft)})` : `Turno de ${current.name}`}
        </span>

        {/* Countdown ring */}
        {isMe && (
          <svg className="w-5 h-5 sm:w-6 sm:h-6 -rotate-90 flex-shrink-0" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" fill="none"
              stroke={urgent ? 'rgba(248,113,113,0.3)' : 'rgba(74,222,128,0.3)'}
              strokeWidth="2.5"
            />
            <circle cx="12" cy="12" r="9" fill="none"
              stroke={urgent ? '#f87171' : '#4ade80'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 9}
              strokeDashoffset={2 * Math.PI * 9 * (1 - timeLeft / 10)}
              className="transition-all duration-100"
            />
          </svg>
        )}

        {/* Pulsing dot (only for others) */}
        {!isMe && (
          <span className="relative flex h-2 w-2.5 sm:h-2.5 sm:w-2.5 flex-shrink-0">
            <span
              className={`
                animate-ping absolute inline-flex h-full w-full rounded-full opacity-75
                bg-yellow-400
              `}
            />
            <span
              className={`
                relative inline-flex rounded-full h-2 w-2.5 sm:h-2.5 sm:w-2.5
                bg-yellow-500
              `}
            />
          </span>
        )}
      </div>
    </div>
  )
}
