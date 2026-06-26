import { useGameStore } from '../store'

export default function End() {
  const winnerName = useGameStore(s => s.winnerName)
  const playerId = useGameStore(s => s.playerId)
  const winnerId = useGameStore(s => s.winnerId)
  const roomCode = useGameStore(s => s.roomCode)
  const rematch = useGameStore(s => s.rematch)
  const reset = useGameStore(s => s.reset)

  const isWinner = winnerId === playerId

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm text-center">
        <h1 className="text-4xl font-bold mb-2">
          {isWinner ? '🎉 ¡Ganaste!' : 'Fin de la partida'}
        </h1>
        <p className="text-xl text-gray-300 mb-6">
          ¡{winnerName} gana!
        </p>
        {roomCode && (
          <button
            className="w-full py-3 rounded-lg bg-red-600 hover:bg-red-700 font-bold text-lg transition mb-3"
            onClick={rematch}
          >
            Volver a la sala
          </button>
        )}
        <button
          className="w-full py-3 rounded-lg bg-gray-600 hover:bg-gray-700 font-bold text-lg transition"
          onClick={reset}
        >
          Salir
        </button>
      </div>
    </div>
  )
}
