import { useGameStore } from '../store'

export default function TurnIndicator() {
  const players = useGameStore(s => s.players)
  const currentPlayerId = useGameStore(s => s.currentPlayerId)
  const playerId = useGameStore(s => s.playerId)
  const direction = useGameStore(s => s.direction)

  const current = players.find(p => p.id === currentPlayerId)
  if (!current) return null

  const isMe = currentPlayerId === playerId

  return (
    <div className="fixed top-2 sm:top-4 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-1rem)]">
      <div
        className={`
          flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl
          backdrop-blur-md shadow-lg border
          transition-all duration-500
          ${isMe
            ? 'bg-green-500/15 border-green-500/40 shadow-green-500/10'
            : 'bg-white/5 border-white/10'
          }
        `}
      >
        {/* Direction arrow */}
        <span className="text-base sm:text-lg text-gray-400 select-none">
          {direction === 1 ? '▶' : '◀'}
        </span>

        {/* Current player name */}
        <span className={`font-bold text-xs sm:text-sm tracking-wide truncate max-w-[180px] sm:max-w-none ${isMe ? 'text-green-400' : 'text-white/80'}`}>
          {isMe ? 'Tu turno' : `Turno de ${current.name}`}
        </span>

        {/* Pulsing dot */}
        <span className="relative flex h-2 w-2.5 sm:h-2.5 sm:w-2.5 flex-shrink-0">
          <span
            className={`
              animate-ping absolute inline-flex h-full w-full rounded-full opacity-75
              ${isMe ? 'bg-green-400' : 'bg-yellow-400'}
            `}
          />
          <span
            className={`
              relative inline-flex rounded-full h-2 w-2.5 sm:h-2.5 sm:w-2.5
              ${isMe ? 'bg-green-500' : 'bg-yellow-500'}
            `}
          />
        </span>
      </div>
    </div>
  )
}
