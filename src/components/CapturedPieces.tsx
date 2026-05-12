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

const capturedPieceOrder: PieceType[] = ['pawn', 'knight', 'bishop', 'rook', 'queen'];

type CaptureSummary = {
  pieceGroups: CapturedPieceGroup[];
};

function CapturedPieceIcon({ color, type }: Pick<CapturedPieceGroup, 'color' | 'type'>) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <span className="captured-piece-token" title={`${color} ${type}`} aria-hidden="true">
      <span className="captured-piece-copy">
        {!imageFailed ? (
          <img src={`/pieces/${color}-${type}.png`} alt="" draggable={false} onError={() => setImageFailed(true)} />
        ) : (
          <span className="captured-piece-fallback">{pieceFallbacks[color][type]}</span>
        )}
      </span>
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
  return [...groups.values()].sort((a, b) => {
    const aIndex = capturedPieceOrder.indexOf(a.type);
    const bIndex = capturedPieceOrder.indexOf(b.type);
    return (aIndex === -1 ? capturedPieceOrder.length : aIndex) - (bIndex === -1 ? capturedPieceOrder.length : bIndex);
  });
}

function getCaptureSummary(moves: Array<MoveRecord | MoveDelta>, side: Color): CaptureSummary {
  return {
    pieceGroups: groupCapturedPieces(moves, side),
  };
}

function CapturedPieceList({ pieceGroups }: { pieceGroups: CapturedPieceGroup[] }) {
  const pieces = pieceGroups.flatMap((group) => Array.from({ length: group.count }, (_, index) => ({ color: group.color, type: group.type, key: `${group.color}-${group.type}-${index}` })));

  return (
    <div className="captured-piece-list">
      {pieces.length === 0 ? <span className="captured-empty">—</span> : pieces.map((piece) => (
        <CapturedPieceIcon key={piece.key} color={piece.color} type={piece.type} />
      ))}
    </div>
  );
}

function CapturedSide({ side, moves }: { side: Color; moves: Array<MoveRecord | MoveDelta> }) {
  const summary = getCaptureSummary(moves, side);
  return (
    <div className={`captured-side captured-side-${side}`} aria-label={`Pieces captured by ${side}`}>
      <CapturedPieceList pieceGroups={summary.pieceGroups} />
    </div>
  );
}

export function CapturedScoreRow({ side, moves, isActive = false }: { side: Color; moves: Array<MoveRecord | MoveDelta>; scoringSide?: Color; isActive?: boolean }) {
  const summary = getCaptureSummary(moves, side);
  const sideLabel = side === 'white' ? 'White:' : 'Black:';
  return (
    <div className={`score-row score-capture-row ${isActive ? 'active-score-row' : ''}`} aria-label={`${sideLabel} captured pieces`}>
      <strong className="score-side-name">{sideLabel}</strong>
      <CapturedPieceList pieceGroups={summary.pieceGroups} />
    </div>
  );
}

export function CapturedPieces({ moves }: { moves: Array<MoveRecord | MoveDelta>; scoringSide?: Color }) {
  return (
    <div className="captured-pieces-row" aria-label="Captured pieces">
      <CapturedSide side="white" moves={moves} />
      <CapturedSide side="black" moves={moves} />
    </div>
  );
}
