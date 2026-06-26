type Props = {
  loaded: number
  total: number
  error?: string
}

export default function LoadingScreen({ loaded, total, error }: Props) {
  const pct = total > 0 ? Math.round((loaded / total) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-6">
      <div className="text-5xl font-black tracking-[0.3em] bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-clip-text text-transparent">
        UNO
      </div>
      {error ? (
        <div className="flex flex-col items-center gap-2 text-red-400">
          <span>Error al cargar los recursos</span>
          <code className="text-xs text-gray-400 max-w-md text-center break-all">{error}</code>
        </div>
      ) : (
        <>
          <div className="w-80 max-w-[80vw] h-2 rounded-full bg-gray-700 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 transition-all duration-200"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-sm text-gray-400 tabular-nums">
            Cargando… {loaded} / {total} · {pct}%
          </div>
        </>
      )}
    </div>
  )
}