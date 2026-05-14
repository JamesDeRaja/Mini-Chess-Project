import { useId, useRef } from 'react';
import type { BoardOrientation } from '../game/boardGeometry.js';
import type { Move } from '../game/types.js';
import { getOverlaySquareGeometry, useOverlayLayout, type OverlaySquareGeometry } from './boardOverlayGeometry.js';

type BestMoveArrowProps = {
  move: Move;
  orientation: BoardOrientation;
};

type Point = {
  x: number;
  y: number;
};

function trimArrowEndpoints(from: OverlaySquareGeometry, to: OverlaySquareGeometry): { start: Point; end: Point } {
  const deltaX = to.centerX - from.centerX;
  const deltaY = to.centerY - from.centerY;
  const length = Math.hypot(deltaX, deltaY) || 1;
  const unitX = deltaX / length;
  const unitY = deltaY / length;
  const startTrim = Math.min(Math.min(from.width, from.height) * 0.28, length * 0.24);
  const endTrim = Math.min(Math.min(to.width, to.height) * 0.38, length * 0.34);

  return {
    start: { x: from.centerX + unitX * startTrim, y: from.centerY + unitY * startTrim },
    end: { x: to.centerX - unitX * endTrim, y: to.centerY - unitY * endTrim },
  };
}

export function BestMoveArrow({ move, orientation }: BestMoveArrowProps) {
  const markerId = useId().replace(/:/g, '');
  const svgRef = useRef<SVGSVGElement | null>(null);
  const layout = useOverlayLayout(svgRef);

  if (!layout) return <svg ref={svgRef} className="best-move-arrow" aria-hidden="true" />;

  const from = getOverlaySquareGeometry(move.from, orientation, layout);
  const to = getOverlaySquareGeometry(move.to, orientation, layout);
  const { start, end } = trimArrowEndpoints(from, to);
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const arrowLength = Math.hypot(deltaX, deltaY) || 1;
  const curveStrength = Math.min(Math.min(from.width, from.height) * 0.28, arrowLength * 0.12);
  const curveX = (start.x + end.x) / 2 + (deltaY / arrowLength) * curveStrength;
  const curveY = (start.y + end.y) / 2 - (deltaX / arrowLength) * curveStrength;
  const arrowPath = `M ${start.x} ${start.y} Q ${curveX} ${curveY} ${end.x} ${end.y}`;
  const haloInset = Math.min(to.width, to.height) * 0.08;
  const arrowHeadSize = Math.max(20, Math.min(30, Math.min(to.width, to.height) * 0.28));
  const arrowHeadTip = arrowHeadSize * 0.88;
  const arrowHeadMid = arrowHeadSize / 2;

  return (
    <svg ref={svgRef} className="best-move-arrow" viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true">
      <defs>
        <marker id={markerId} markerWidth={arrowHeadSize} markerHeight={arrowHeadSize} refX={arrowHeadTip} refY={arrowHeadMid} orient="auto" markerUnits="userSpaceOnUse">
          <path d={`M0,0 L${arrowHeadSize},${arrowHeadMid} L0,${arrowHeadSize} Z`} />
        </marker>
      </defs>
      <rect className="best-move-source-halo" x={from.x + haloInset} y={from.y + haloInset} width={from.width - haloInset * 2} height={from.height - haloInset * 2} rx="14" />
      <rect className="best-move-target-halo" x={to.x + haloInset} y={to.y + haloInset} width={to.width - haloInset * 2} height={to.height - haloInset * 2} rx="14" />
      <path className="best-move-arrow-path-shadow" d={arrowPath} />
      <path className="best-move-arrow-path" d={arrowPath} markerEnd={`url(#${markerId})`} />
    </svg>
  );
}
