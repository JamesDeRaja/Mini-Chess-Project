import { BOARD_FILES, BOARD_RANKS } from '../game/constants';
import { fileLabel, index } from '../game/coordinates';
import type { Board as ChessBoard, GameStatus, Move } from '../game/types';
import { Square } from './Square';

type LastMove = Pick<Move, 'from' | 'to'> | null;

type BoardProps = {
  board: ChessBoard;
  selectedSquare: number | null;
  legalMoves: Move[];
  lastMove: LastMove;
  checkedKingIndex: number | null;
  isFlipped?: boolean;
  isInteractive?: boolean;
  gameStatus?: GameStatus;
  onSquareClick: (squareIndex: number) => void;
  onDragStart?: (squareIndex: number) => boolean;
  onDrop?: (squareIndex: number) => void;
};

function computeSlideOffset(from: number, to: number, isFlipped: boolean) {
  const fromFile = from % BOARD_FILES;
  const fromRank = Math.floor(from / BOARD_FILES);
  const toFile = to % BOARD_FILES;
  const toRank = Math.floor(to / BOARD_FILES);
  const dx = isFlipped ? toFile - fromFile : fromFile - toFile;
  const dy = isFlipped ? fromRank - toRank : toRank - fromRank;
  return { dx, dy };
}

export function Board({
  board,
  selectedSquare,
  legalMoves,
  lastMove,
  checkedKingIndex,
  isFlipped = false,
  isInteractive = true,
  gameStatus,
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
          gameStatus={gameStatus}
          slideOffset={lastMove?.to === squareIndex
            ? computeSlideOffset(lastMove.from, lastMove.to, isFlipped)
            : undefined}
          onClick={() => onSquareClick(squareIndex)}
          onDragStart={onDragStart ? () => onDragStart(squareIndex) : undefined}
          onDrop={onDrop ? () => onDrop(squareIndex) : undefined}
        />,
      );
    }
  }

  return <div className="board">{squares}</div>;
}
