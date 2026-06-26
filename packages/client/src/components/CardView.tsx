import { Card, Color } from '@uno/shared'
import { getAsset } from '../preload'

const KIND_LABEL: Record<string, string> = {
  number: 'Número',
  skip: 'Salto',
  reverse: 'Reversa',
  draw2: '+2',
  wild: 'Comodín',
  wild4: '+4',
}

function cardImage(card: Card): string {
  if (card.kind === 'wild' || card.kind === 'wild4') return `/cards/${card.kind}.svg`
  const type = card.kind === 'number' ? String(card.value) : card.kind
  const color = card.color === Color.Wild ? 'wild' : card.color
  return `/cards/${color}-${type}.svg`
}

type Props = {
  card: Card
  onClick?: () => void
  onDoubleClick?: () => void
  onMouseDown?: (e: React.MouseEvent) => void
  onTouchStart?: (e: React.TouchEvent) => void
  disabled?: boolean
  small?: boolean
  className?: string
}

export default function CardView({ card, onClick, onDoubleClick, onMouseDown, onTouchStart, disabled, small, className }: Props) {
  return (
    <button
      data-testid="card"
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      disabled={disabled}
      className={`
        ${small ? 'w-8 h-12 sm:w-10 sm:h-14' : 'w-12 h-18 sm:w-16 sm:h-24'}
        rounded-lg shadow-lg flex-shrink-0 p-0 overflow-hidden bg-transparent border-0
        transition-transform hover:scale-110 active:scale-95
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className ?? ''}
      `}
    >
      <img src={getAsset(cardImage(card))} alt={KIND_LABEL[card.kind] ?? card.kind} draggable={false} className="w-full h-full object-contain pointer-events-none select-none" />
    </button>
  )
}