import { useGameStore } from '../store'

export default function Lobby() {
  const roomCode = useGameStore(s => s.roomCode)
  const players = useGameStore(s => s.players)
  const playerId = useGameStore(s => s.playerId)
  const startGame = useGameStore(s => s.startGame)
  const reset = useGameStore(s => s.reset)

  const isHost = players.length > 0 && players[0].id === playerId

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-2">Sala de juego</h1>
        <p className="text-gray-400 mb-1">Código de sala</p>
        <p className="text-4xl font-mono font-bold text-yellow-400 tracking-[0.3em] mb-6">
          {roomCode}
        </p>

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-left mb-2">Jugadores ({players.length})</h2>
          <div className="space-y-2">
            {players.map(p => (
              <div
                key={p.id}
                className="flex items-center justify-between bg-gray-700 px-4 py-2 rounded-lg"
              >
                <span className={p.id === playerId ? 'text-green-400 font-semibold' : ''}>
                  {p.name} {p.id === playerId && '(tú)'}
                </span>
                <span className="text-sm text-gray-400">{p.handCount} cartas</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          {isHost && (
            <button
              className="flex-1 py-3 rounded-lg bg-green-600 hover:bg-green-700 font-bold transition disabled:opacity-50"
              onClick={startGame}
              disabled={players.length < 2}
            >
              Iniciar partida
            </button>
          )}
          <button
            className="flex-1 py-3 rounded-lg bg-gray-600 hover:bg-gray-700 font-bold transition"
            onClick={reset}
          >
            Salir
          </button>
        </div>
      </div>
    </div>
  )
}
