import type { CSSProperties, PointerEvent } from 'react';
import type { PieceType, Square as ChessSquare } from '../game/types.js';
import { Piece } from './Piece.js';
import { MoveHint } from './MoveHint.js';

type SquareProps = {
  square: ChessSquare;
  squareIndex: number;
  isSelected: boolean;
  isLegalMove: boolean;
  isCapture: boolean;
  isLastMove: boolean;
  isLastMoveDestination: boolean;
  didLastMoveCapture: boolean;
  movedPieceType: PieceType | null;
  captureScoreFeedback?: number | null;
  spawnOrder: number;
  isKingInCheck: boolean;
  isInteractive: boolean;
  isBoardSelected: boolean;
  isDragSource: boolean;
  isDragHoveredLegal: boolean;
  coordinateLabel: string;
  onClick: () => void;
  onPointerDragStart?: (event: PointerEvent<HTMLButtonElement>, squareIndex: number) => void;
};

export function Square({
  square,
  squareIndex,
  isSelected,
  isLegalMove,
  isCapture,
  isLastMove,
  isLastMoveDestination,
  didLastMoveCapture,
  movedPieceType,
  captureScoreFeedback,
  spawnOrder,
  isKingInCheck,
  isInteractive,
  isBoardSelected,
  isDragSource,
  isDragHoveredLegal,
  coordinateLabel,
  onClick,
  onPointerDragStart,
}: SquareProps) {
  const pieceLabel = square.piece ? `${square.piece.color === 'white' ? 'White' : 'Black'} ${square.piece.type} at ${coordinateLabel}` : `Empty square ${coordinateLabel}`;
  const stateLabel = [isSelected ? 'selected' : '', isLegalMove ? (isCapture ? 'capture available' : 'legal move available') : '', isLastMove ? 'last move' : '', isKingInCheck ? 'king in check' : ''].filter(Boolean).join(', ');
  const squareColor = (square.file + square.rank) % 2 === 0 ? 'light' : 'dark';
  const className = [
    'square',
    `square-${squareColor}`,
    isSelected ? 'selected-square' : '',
    isLegalMove ? 'legal-target-square' : '',
    isCapture ? 'capture-target-square' : '',
    isLastMove ? 'last-move-square' : '',
    isLastMoveDestination ? 'last-move-destination-square' : '',
    isLastMoveDestination && didLastMoveCapture ? 'capture-impact-square' : '',
    movedPieceType ? `moved-piece-${movedPieceType}` : '',
    isKingInCheck ? 'king-in-check' : '',
    isDragSource ? 'drag-source-square' : '',
    isDragHoveredLegal ? 'drag-hover-square' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const squareStyle = { '--spawn-order': spawnOrder } as CSSProperties;

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!square.piece || !isInteractive || !onPointerDragStart) return;
    onPointerDragStart(event, squareIndex);
  }

  return (
    <button
      className={className}
      data-square-index={squareIndex}
      style={squareStyle}
      onClick={onClick}
      onPointerDown={handlePointerDown}
      role="gridcell"
      tabIndex={isInteractive || isBoardSelected || square.piece ? 0 : -1}
      aria-label={stateLabel ? `${pieceLabel}, ${stateLabel}` : pieceLabel}
      aria-pressed={isSelected}
    >
      {square.piece && !isDragSource && (
        <Piece
          piece={square.piece}
          isDraggable={isInteractive}
          isSelected={isSelected}
        />
      )}
      {isLastMoveDestination && <span className="move-impact" aria-hidden="true" />}
      {isLastMoveDestination && didLastMoveCapture && <span className="capture-shards" aria-hidden="true" />}
      {isLastMoveDestination && didLastMoveCapture && captureScoreFeedback ? (
        <span
          key={`capture-score-${squareIndex}-${captureScoreFeedback}`}
          className={captureScoreFeedback < 0 ? 'capture-score-pop capture-score-penalty' : 'capture-score-pop'}
          aria-hidden="true"
        >
          {captureScoreFeedback > 0 ? `+${captureScoreFeedback}` : captureScoreFeedback}
        </span>
      ) : null}
      {isLegalMove && <MoveHint isCapture={isCapture} />}
    </button>
  );
}
