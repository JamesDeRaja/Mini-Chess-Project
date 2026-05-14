import { useId } from 'react';
import { getSquareBounds, getSquareCenter, type BoardOrientation } from '../game/boardGeometry.js';
import type { Move } from '../game/types.js';

type BestMoveArrowProps = {
  move: Move;
  orientation: BoardOrientation;
};

function trimArrowEndpoints(from: ReturnType<typeof getSquareCenter>, to: ReturnType<typeof getSquareCenter>) {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const length = Math.hypot(deltaX, deltaY) || 1;
  const unitX = deltaX / length;
  const unitY = deltaY / length;
  const startTrim = Math.min(4.2, length * 0.22);
  const endTrim = Math.min(7.2, length * 0.34);

  return {
    start: { x: from.x + unitX * startTrim, y: from.y + unitY * startTrim },
    end: { x: to.x - unitX * endTrim, y: to.y - unitY * endTrim },
  };
}

export function BestMoveArrow({ move, orientation }: BestMoveArrowProps) {
  const markerId = useId().replace(/:/g, '');
  const from = getSquareCenter(move.from, orientation);
  const to = getSquareCenter(move.to, orientation);
  const target = getSquareBounds(move.to, orientation);
  const { start, end } = trimArrowEndpoints(from, to);
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const curveStrength = Math.min(5, Math.hypot(deltaX, deltaY) * 0.12);
  const curveX = (start.x + end.x) / 2 + (deltaY / (Math.hypot(deltaX, deltaY) || 1)) * curveStrength;
  const curveY = (start.y + end.y) / 2 - (deltaX / (Math.hypot(deltaX, deltaY) || 1)) * curveStrength;
  const arrowPath = `M ${start.x} ${start.y} Q ${curveX} ${curveY} ${end.x} ${end.y}`;

  return (
    <svg className="best-move-arrow" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <marker id={markerId} markerWidth="4.8" markerHeight="4.8" refX="4.2" refY="2.4" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L4.8,2.4 L0,4.8 Z" />
        </marker>
      </defs>
      <rect className="best-move-target-halo" x={target.x + 1.3} y={target.y + 1.1} width={target.width - 2.6} height={target.height - 2.2} rx="2.2" />
      <circle className="best-move-source-dot" cx={from.x} cy={from.y} r="1.9" />
      <path className="best-move-arrow-path-shadow" d={arrowPath} />
      <path className="best-move-arrow-path" d={arrowPath} markerEnd={`url(#${markerId})`} />
    </svg>
  );
}
