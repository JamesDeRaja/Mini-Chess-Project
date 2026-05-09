import { pieceSymbols } from '../game/constants';
import type { Piece as ChessPiece } from '../game/types';

type PieceProps = {
  piece: ChessPiece;
};

export function Piece({ piece }: PieceProps) {
  return (
    <span className={`piece piece-${piece.color}`} aria-label={`${piece.color} ${piece.type}`}>
      {pieceSymbols[piece.color][piece.type]}
    </span>
  );
}
