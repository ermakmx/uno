import { getAsset } from '../preload'

type Props = {
  count?: number
  small?: boolean
}

export default function CardBack({ count, small }: Props) {
  return (
    <div className="relative">
      <div
        className={`
          ${small ? 'w-7 h-10 sm:w-8 sm:h-12' : 'w-12 h-18 sm:w-16 sm:h-24'}
          rounded-lg overflow-hidden shadow-lg flex-shrink-0 bg-transparent border-0
          transition-transform hover:scale-105
        `}
      >
        <img src={getAsset('/cards/back.png')} alt="Dorso" draggable={false} className="w-full h-full object-contain pointer-events-none select-none" />
      </div>
      {count !== undefined && (
        <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {count}
        </span>
      )}
    </div>
  )
}
