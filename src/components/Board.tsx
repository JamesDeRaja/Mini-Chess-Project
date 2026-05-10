import { BOARD_FILES, BOARD_RANKS } from '../game/constants.js';
import { fileLabel, index } from '../game/coordinates.js';
import type { Board as ChessBoard, Move } from '../game/types.js';
import { Square } from './Square.js';

type LastMove = Pick<Move, 'from' | 'to'> | null;

type BoardProps = {
  board: ChessBoard;
  selectedSquare: number | null;
  legalMoves: Move[];
  lastMove: LastMove;
  checkedKingIndex: number | null;
  isFlipped?: boolean;
  isInteractive?: boolean;
  onSquareClick: (squareIndex: number) => void;
  onDragStart?: (squareIndex: number) => boolean;
  onDrop?: (squareIndex: number) => void;
};

export function Board({
  board,
  selectedSquare,
  legalMoves,
  lastMove,
  checkedKingIndex,
  isFlipped = false,
  isInteractive = true,
  onSquareClick,
  onDragStart,
  onDrop,
}: BoardProps) {
  const squares = [];
  const ranks = Array.from({ length: BOARD_RANKS }, (_, rank) => rank);
  const files = Array.from({ length: BOARD_FILES }, (_, file) => file);
  const visualRanks = isFlipped ? ranks : [...ranks].reverse();
  const visualFiles = isFlipped ? [...files].reverse() : files;

  for (const rank of visualRanks) {
    for (const file of visualFiles) {
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
          isInteractive={isInteractive}
          coordinateLabel={`${fileLabel(file)}${rank + 1}`}
          onClick={() => onSquareClick(squareIndex)}
          onDragStart={onDragStart ? () => onDragStart(squareIndex) : undefined}
          onDrop={onDrop ? () => onDrop(squareIndex) : undefined}
        />,
      );
    }
  }

  return (
    <div className="board-shell">
      <div className="board">{squares}</div>
      <div className="board-label" aria-hidden="true"><span>✣</span> 5x6 Board</div>
    </div>
  );
}
