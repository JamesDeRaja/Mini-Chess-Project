import { getSquareCenter, type BoardOrientation } from '../game/boardGeometry.js';

type MoveQualityBadgeProps = {
  square: number;
  orientation: BoardOrientation;
  label?: string;
};

export function MoveQualityBadge({ square, orientation, label = '+ Best' }: MoveQualityBadgeProps) {
  const center = getSquareCenter(square, orientation);

  return (
    <div
      className="move-quality-badge"
      style={{ left: `${center.x}%`, top: `${center.y}%` }}
      aria-hidden="true"
    >
      <span className="move-quality-star">★</span>
      <span>{label}</span>
    </div>
  );
}
