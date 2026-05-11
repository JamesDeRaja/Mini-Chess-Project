import { useState } from 'react';
import { getCaptureRecords } from '../game/scoring.js';
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

function CapturedSide({ side, moves }: { side: Color; moves: Array<MoveRecord | MoveDelta> }) {
  const captures = getCaptureRecords(moves).filter((capture) => capture.capturingSide === side);
  const pieceGroups = groupCapturedPieces(moves, side);
  const points = captures.reduce((total, capture) => total + capture.scoreValue, 0);
  return (
    <div className={`captured-side captured-side-${side}`} aria-label={`Pieces captured by ${side}`}>
      <span className="captured-label">{side === 'white' ? 'White captures' : 'Black captures'}</span>
      <div className="captured-piece-list">
        {pieceGroups.length === 0 ? <span className="captured-empty">—</span> : pieceGroups.map((group) => (
          <CapturedPieceIcon key={`${side}-${group.color}-${group.type}`} {...group} />
        ))}
      </div>
      <span className="captured-points">+{points}</span>
    </div>
  );
}

export function CapturedPieces({ moves }: { moves: Array<MoveRecord | MoveDelta> }) {
  return (
    <div className="captured-pieces-row" aria-label="Captured pieces">
      <CapturedSide side="white" moves={moves} />
      <CapturedSide side="black" moves={moves} />
    </div>
  );
}
