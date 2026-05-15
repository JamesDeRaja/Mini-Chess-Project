import { useRef } from 'react';
import type { BoardOrientation } from '../game/boardGeometry.js';
import { getOverlaySquareGeometry, useOverlayLayout } from './boardOverlayGeometry.js';

type MoveQualityBadgeProps = {
  square: number;
  orientation: BoardOrientation;
  label?: string;
};

export function MoveQualityBadge({ square, orientation, label = '+ Best' }: MoveQualityBadgeProps) {
  const badgeRef = useRef<HTMLDivElement | null>(null);
  const layout = useOverlayLayout(badgeRef);
  const squareGeometry = layout ? getOverlaySquareGeometry(square, orientation, layout) : null;

  const badgeStyle = squareGeometry && layout
    ? squareGeometry.centerX > layout.width / 2
      ? { right: layout.width - squareGeometry.x - squareGeometry.width * 0.38, top: squareGeometry.y + squareGeometry.height * 0.28 }
      : { left: squareGeometry.x + squareGeometry.width * 0.62, top: squareGeometry.y + squareGeometry.height * 0.28 }
    : undefined;

  return (
    <div
      ref={badgeRef}
      className="move-quality-badge"
      style={badgeStyle}
      aria-hidden="true"
    >
      <span className="move-quality-star">★</span>
      <span>{label}</span>
    </div>
  );
}
