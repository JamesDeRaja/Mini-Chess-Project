import type { Square as ChessSquare } from '../game/types';
import { Piece } from './Piece';
import { MoveHint } from './MoveHint';

type SquareProps = {
  square: ChessSquare;
  isSelected: boolean;
  isLegalMove: boolean;
  isCapture: boolean;
  isLastMove: boolean;
  isKingInCheck: boolean;
  onClick: () => void;
};

export function Square({ square, isSelected, isLegalMove, isCapture, isLastMove, isKingInCheck, onClick }: SquareProps) {
  const squareColor = (square.file + square.rank) % 2 === 0 ? 'light' : 'dark';
  const className = [
    'square',
    `square-${squareColor}`,
    isSelected ? 'selected-square' : '',
    isLastMove ? 'last-move-square' : '',
    isKingInCheck ? 'king-in-check' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={className} onClick={onClick} aria-label={`Square ${square.file},${square.rank}`}>
      {square.piece && <Piece piece={square.piece} />}
      {isLegalMove && <MoveHint isCapture={isCapture} />}
    </button>
  );
}
