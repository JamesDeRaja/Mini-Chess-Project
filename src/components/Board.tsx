import { BOARD_FILES, BOARD_RANKS } from '../game/constants';
import { index } from '../game/coordinates';
import type { Board as ChessBoard, Move } from '../game/types';
import { Square } from './Square';

type BoardProps = {
  board: ChessBoard;
  selectedSquare: number | null;
  legalMoves: Move[];
  lastMove: Move | null;
  checkedKingIndex: number | null;
  onSquareClick: (squareIndex: number) => void;
};

export function Board({ board, selectedSquare, legalMoves, lastMove, checkedKingIndex, onSquareClick }: BoardProps) {
  const squares = [];

  for (let rank = BOARD_RANKS - 1; rank >= 0; rank -= 1) {
    for (let file = 0; file < BOARD_FILES; file += 1) {
      const squareIndex = index(file, rank);
      const legalMove = legalMoves.find((move) => move.to === squareIndex);
      squares.push(
        <Square
          key={squareIndex}
          square={board[squareIndex]}
          isSelected={selectedSquare === squareIndex}
          isLegalMove={Boolean(legalMove)}
          isCapture={Boolean(legalMove?.isCapture)}
          isLastMove={lastMove?.from === squareIndex || lastMove?.to === squareIndex}
          isKingInCheck={checkedKingIndex === squareIndex}
          onClick={() => onSquareClick(squareIndex)}
        />,
      );
    }
  }

  return <div className="board">{squares}</div>;
}
