import { useRef } from 'react';
import type { BoardOrientation } from '../game/boardGeometry.js';
import { getOverlaySquareGeometry, useOverlayLayout } from './boardOverlayGeometry.js';

type MoveQualityBadgeProps = {
  square: number;
  orientation: BoardOrientation;
  label?: string;
  variant?: 'best' | 'blunder';
};

export function MoveQualityBadge({ square, orientation, label = '+ Best', variant = 'best' }: MoveQualityBadgeProps) {
  const badgeRef = useRef<HTMLDivElement | null>(null);
  const layout = useOverlayLayout(badgeRef);
  const squareGeometry = layout ? getOverlaySquareGeometry(square, orientation, layout) : null;

  return (
    <div
      ref={badgeRef}
      className={variant === 'blunder' ? 'move-quality-badge move-quality-badge-blunder' : 'move-quality-badge'}
      style={squareGeometry ? { left: squareGeometry.x + squareGeometry.width * 0.62, top: squareGeometry.y + squareGeometry.height * 0.28 } : undefined}
      aria-hidden="true"
    >
      <span className="move-quality-star">{variant === 'blunder' ? '!' : '★'}</span>
      <span>{label}</span>
    </div>
  );
}
