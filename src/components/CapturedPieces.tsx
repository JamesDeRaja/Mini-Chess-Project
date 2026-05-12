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

const capturedPieceOrder: PieceType[] = ['pawn', 'knight', 'bishop', 'rook', 'queen'];

type CaptureSummary = {
  pieceGroups: CapturedPieceGroup[];
  points: number;
  isPenalty: boolean;
  pointsLabel: string;
};

function CapturedPieceIcon({ color, type, count }: CapturedPieceGroup) {
  const [imageFailed, setImageFailed] = useState(false);
  const copies = Array.from({ length: count }, (_, index) => index);

  return (
    <span
      className="captured-piece-token"
      title={`${count} ${color} ${type}${count === 1 ? '' : 's'}`}
    >
      {copies.map((index) => (
        <span className="captured-piece-copy" key={`${color}-${type}-${index}`} aria-hidden="true">
          {!imageFailed ? (
            <img src={`/pieces/${color}-${type}.png`} alt="" draggable={false} onError={() => setImageFailed(true)} />
          ) : (
            <span className="captured-piece-fallback">{pieceFallbacks[color][type]}</span>
          )}
        </span>
      ))}
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

function getCaptureSummary(moves: Array<MoveRecord | MoveDelta>, side: Color, scoringSide?: Color): CaptureSummary {
  const captures = getCaptureRecords(moves).filter((capture) => capture.capturingSide === side);
  const isPenalty = Boolean(scoringSide && side !== scoringSide);
  const points = captures.reduce((total, capture) => total + (isPenalty ? getCapturePenaltyScore(capture.capturedPiece) : capture.scoreValue), 0);
  return {
    pieceGroups: groupCapturedPieces(moves, side),
    points,
    isPenalty,
    pointsLabel: isPenalty ? `-${points}` : `+${points}`,
  };
}

function CapturedPieceList({ pieceGroups }: { pieceGroups: CapturedPieceGroup[] }) {
  return (
    <div className="captured-piece-list">
      {pieceGroups.length === 0 ? <span className="captured-empty">—</span> : pieceGroups.map((group) => (
        <CapturedPieceIcon key={`${group.color}-${group.type}`} {...group} />
      ))}
    </div>
  );
}

function CapturedSide({ side, moves, scoringSide }: { side: Color; moves: Array<MoveRecord | MoveDelta>; scoringSide?: Color }) {
  const summary = getCaptureSummary(moves, side, scoringSide);
  return (
    <div className={`captured-side captured-side-${side}`} aria-label={`Pieces captured by ${side}`}>
      <CapturedPieceList pieceGroups={summary.pieceGroups} />
      <span className={summary.isPenalty ? 'captured-points captured-points-penalty' : 'captured-points'}>{summary.pointsLabel}</span>
    </div>
  );
}

export function CapturedScoreRow({ side, moves, scoringSide, isActive = false }: { side: Color; moves: Array<MoveRecord | MoveDelta>; scoringSide?: Color; isActive?: boolean }) {
  const summary = getCaptureSummary(moves, side, scoringSide);
  const sideLabel = side === 'white' ? 'White:' : 'Black:';
  return (
    <div className={`score-row score-capture-row ${isActive ? 'active-score-row' : ''}`} aria-label={`${sideLabel} captured pieces and points`}>
      <strong className="score-side-name">{sideLabel}</strong>
      <CapturedPieceList pieceGroups={summary.pieceGroups} />
      <strong className={summary.isPenalty ? 'captured-points captured-points-penalty' : 'captured-points'}>{summary.pointsLabel}</strong>
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
