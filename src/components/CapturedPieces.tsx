import { useState } from 'react';
import { getCapturePenaltyScore, getCaptureRecords } from '../game/scoring.js';
import type { Color, MoveDelta, MoveRecord, PieceType } from '../game/types.js';

const pieceFallbacks: Record<Color, Record<PieceType, string>> = {
  white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
  black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' },
};

type CapturedPieceGroup = {
  color: Color;
  type: PieceType;
  count: number;
};

function CapturedPieceIcon({ color, type, count }: CapturedPieceGroup) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <span className="captured-piece-token" title={`${count} ${color} ${type}${count === 1 ? '' : 's'}`}>
      {!imageFailed ? (
        <img src={`/pieces/${color}-${type}.png`} alt="" draggable={false} onError={() => setImageFailed(true)} />
      ) : (
        <span className="captured-piece-fallback" aria-hidden="true">{pieceFallbacks[color][type]}</span>
      )}
      {count > 1 && <span className="captured-piece-count" aria-hidden="true">×{count}</span>}
    </span>
  );
}

function groupCapturedPieces(moves: Array<MoveRecord | MoveDelta>, side: Color): CapturedPieceGroup[] {
  const groups = new Map<string, CapturedPieceGroup>();
  for (const capture of getCaptureRecords(moves)) {
    if (capture.capturingSide !== side) continue;
    const key = `${capture.capturedColor}-${capture.capturedPiece}`;
    const group = groups.get(key) ?? { color: capture.capturedColor, type: capture.capturedPiece, count: 0 };
    group.count += 1;
    groups.set(key, group);
  }
  return [...groups.values()];
}

function CapturedSide({ side, moves, scoringSide }: { side: Color; moves: Array<MoveRecord | MoveDelta>; scoringSide?: Color }) {
  const captures = getCaptureRecords(moves).filter((capture) => capture.capturingSide === side);
  const pieceGroups = groupCapturedPieces(moves, side);
  const isEnemyCaptureRow = Boolean(scoringSide && side !== scoringSide);
  const points = captures.reduce((total, capture) => total + (isEnemyCaptureRow ? getCapturePenaltyScore(capture.capturedPiece) : capture.scoreValue), 0);
  const pointsLabel = isEnemyCaptureRow ? `-${points}` : `+${points}`;
  return (
    <div className={`captured-side captured-side-${side}`} aria-label={`Pieces captured by ${side}`}>
      <div className="captured-piece-list">
        {pieceGroups.length === 0 ? <span className="captured-empty">—</span> : pieceGroups.map((group) => (
          <CapturedPieceIcon key={`${side}-${group.color}-${group.type}`} {...group} />
        ))}
      </div>
      <span className={isEnemyCaptureRow ? 'captured-points captured-points-penalty' : 'captured-points'}>{pointsLabel}</span>
    </div>
  );
}

export function CapturedPieces({ moves, scoringSide }: { moves: Array<MoveRecord | MoveDelta>; scoringSide?: Color }) {
  return (
    <div className="captured-pieces-row" aria-label="Captured pieces">
      <CapturedSide side="white" moves={moves} scoringSide={scoringSide} />
      <CapturedSide side="black" moves={moves} scoringSide={scoringSide} />
    </div>
  );
}
