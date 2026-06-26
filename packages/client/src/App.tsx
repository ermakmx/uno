import { useEffect, useState } from 'react'
import { useGameStore } from './store'
import { preloadAssets, type LoadState } from './preload'
import LoadingScreen from './components/LoadingScreen'
import Home from './pages/Home'
import Lobby from './pages/Lobby'
import Game from './pages/Game'
import End from './pages/End'

function App() {
  const page = useGameStore(s => s.page)
  const [load, setLoad] = useState<LoadState>({ loaded: 0, total: 0 })

  useEffect(() => {
    let cancelled = false
    preloadAssets(s => { if (!cancelled) setLoad(s) })
      .catch(() => { /* error surfaced via state */ })
    return () => { cancelled = true }
  }, [])

  if (load.loaded < load.total && !load.error) {
    return <LoadingScreen loaded={load.loaded} total={load.total} />
  }
  if (load.error) {
    return <LoadingScreen loaded={load.loaded} total={load.total} error={load.error} />
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {page === 'home' && <Home />}
      {page === 'lobby' && <Lobby />}
      {page === 'game' && <Game />}
      {page === 'ended' && <End />}
    </div>
  )
}

export default App