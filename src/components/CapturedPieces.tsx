import { getCaptureRecords } from '../game/scoring.js';
import type { Color, MoveDelta, MoveRecord, PieceType } from '../game/types.js';

const pieceFallbacks: Record<Color, Record<PieceType, string>> = {
  white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
  black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' },
};

function CapturedPieceIcon({ color, type }: { color: Color; type: PieceType }) {
  return (
    <span className="captured-piece-token" title={`${color} ${type}`}>
      <img src={`/pieces/${color}-${type}.png`} alt="" draggable={false} onError={(event) => { event.currentTarget.style.display = 'none'; }} />
      <span className="captured-piece-fallback" aria-hidden="true">{pieceFallbacks[color][type]}</span>
    </span>
  );
}

function CapturedSide({ side, moves }: { side: Color; moves: Array<MoveRecord | MoveDelta> }) {
  const captures = getCaptureRecords(moves).filter((capture) => capture.capturingSide === side);
  const points = captures.reduce((total, capture) => total + capture.scoreValue, 0);
  return (
    <div className={`captured-side captured-side-${side}`} aria-label={`Pieces captured by ${side}`}>
      <span className="captured-label">{side === 'white' ? 'White captures' : 'Black captures'}</span>
      <div className="captured-piece-list">
        {captures.length === 0 ? <span className="captured-empty">—</span> : captures.map((capture, index) => (
          <CapturedPieceIcon key={`${side}-${capture.moveNumber}-${capture.capturedPiece}-${index}`} color={capture.capturedColor} type={capture.capturedPiece} />
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
