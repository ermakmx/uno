import { useState, useEffect } from 'react'
import { useGameStore } from '../store'

export default function Home() {
  const setPlayerName = useGameStore(s => s.setPlayerName)
  const createRoom = useGameStore(s => s.createRoom)
  const joinRoom = useGameStore(s => s.joinRoom)
  const fetchPublicRooms = useGameStore(s => s.fetchPublicRooms)
  const error = useGameStore(s => s.error)
  const playerName = useGameStore(s => s.playerName)
  const publicRooms = useGameStore(s => s.publicRooms)

  const [joinCode, setJoinCode] = useState('')

  useEffect(() => {
    fetchPublicRooms()
  }, [fetchPublicRooms])

  const handleCreatePrivate = () => {
    if (!playerName.trim()) return
    createRoom(false)
  }

  const handleCreatePublic = () => {
    if (!playerName.trim()) return
    createRoom(true)
  }

  const handleJoin = (code?: string) => {
    if (!playerName.trim()) return
    joinRoom(code ?? joinCode)
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md mb-6">
        <h1 className="text-4xl sm:text-5xl font-bold text-center mb-2 text-red-500">UNO</h1>
        <p className="text-center text-gray-400 mb-6">Multijugador en línea</p>

        <div className="space-y-4">
          <input
            className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 focus:border-red-500 focus:outline-none text-white placeholder-gray-400"
            placeholder="Tu nombre"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            maxLength={20}
          />

          <div className="flex gap-2">
            <button
              className="flex-1 py-3 rounded-lg bg-red-600 hover:bg-red-700 font-bold text-lg transition"
              onClick={handleCreatePrivate}
            >
              Crear privada
            </button>
            <button
              className="flex-1 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 font-bold text-lg transition"
              onClick={handleCreatePublic}
            >
              Crear pública
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-600" />
            <span className="text-gray-400 text-sm">O</span>
            <div className="flex-1 h-px bg-gray-600" />
          </div>

          <div className="flex gap-2">
            <input
              className="flex-1 px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 focus:border-red-500 focus:outline-none text-white placeholder-gray-400 uppercase tracking-widest"
              placeholder="Código de sala"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
            />
            <button
              className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 font-bold transition"
              onClick={() => handleJoin()}
            >
              Unirse
            </button>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}
        </div>
      </div>

      {/* Public games */}
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Partidas públicas</h2>
          <button
            className="text-sm text-gray-400 hover:text-white transition"
            onClick={fetchPublicRooms}
          >
            Actualizar
          </button>
        </div>

        {publicRooms.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No hay partidas públicas disponibles</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {publicRooms.map(room => (
              <div
                key={room.code}
                className="flex items-center justify-between bg-gray-700 px-4 py-3 rounded-lg"
              >
                <div>
                  <span className="font-mono font-bold text-yellow-400 tracking-wider">
                    {room.code}
                  </span>
                  <span className="text-gray-400 text-sm ml-3">
                    {room.hostName}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400">
                    {room.playerCount}/10
                  </span>
                  <button
                    className="px-4 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 font-bold text-sm transition"
                    onClick={() => handleJoin(room.code)}
                    disabled={!playerName.trim()}
                  >
              Unirse
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
