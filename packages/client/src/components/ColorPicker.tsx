import { Color } from '@uno/shared'
import { useGameStore } from '../store'

const colors = [
  { color: Color.Red, bg: 'bg-red-600 hover:bg-red-500' },
  { color: Color.Blue, bg: 'bg-blue-600 hover:bg-blue-500' },
  { color: Color.Green, bg: 'bg-green-600 hover:bg-green-500' },
  { color: Color.Yellow, bg: 'bg-yellow-500 hover:bg-yellow-400' },
]

export default function ColorPicker() {
  const playCard = useGameStore(s => s.playCard)
  const setShowColorPicker = useGameStore(s => s.setShowColorPicker)
  const pendingWildIndex = useGameStore(s => s.pendingWildIndex)

  const selectColor = (color: Color) => {
    if (pendingWildIndex !== null) {
      playCard(pendingWildIndex, color)
    }
    setShowColorPicker(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-2xl shadow-2xl">
        <h2 className="text-xl font-bold mb-4 text-center">Elige un color</h2>
        <div className="flex gap-3">
          {colors.map(({ color, bg }) => (
            <button
              key={color}
              className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full ${bg} border-2 border-white/30 transition-transform hover:scale-110`}
              onClick={() => selectColor(color)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
