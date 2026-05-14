import { getSquareCenter, type BoardOrientation } from '../game/boardGeometry.js';
import type { Move } from '../game/types.js';

type BestMoveArrowProps = {
  move: Move;
  orientation: BoardOrientation;
};

export function BestMoveArrow({ move, orientation }: BestMoveArrowProps) {
  const from = getSquareCenter(move.from, orientation);
  const to = getSquareCenter(move.to, orientation);
  const curveX = (from.x + to.x) / 2 + (from.y === to.y ? 0 : (to.y - from.y) * 0.08);
  const curveY = (from.y + to.y) / 2 - Math.max(3, Math.abs(to.x - from.x) * 0.05);

  return (
    <svg className="best-move-arrow" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <marker id="best-move-arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L6,3 L0,6 Z" />
        </marker>
      </defs>
      <path className="best-move-arrow-path-shadow" d={`M ${from.x} ${from.y} Q ${curveX} ${curveY} ${to.x} ${to.y}`} />
      <path className="best-move-arrow-path" d={`M ${from.x} ${from.y} Q ${curveX} ${curveY} ${to.x} ${to.y}`} markerEnd="url(#best-move-arrowhead)" />
      <text className="best-move-arrow-label" x={to.x} y={to.y} dx="3" dy="-3">Suggested</text>
    </svg>
  );
}
