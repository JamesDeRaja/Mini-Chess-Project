import type { CSSProperties, PointerEvent } from 'react';
import type { PieceType, Square as ChessSquare } from '../game/types.js';
import { Piece } from './Piece.js';
import { MoveHint } from './MoveHint.js';

type SquareResultMarker = { icon: string; label: string; tone: 'win' | 'loss' | 'draw' };

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
  resultMarker?: SquareResultMarker | null;
  blunderMarker?: boolean;
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
  resultMarker = null,
  blunderMarker = false,
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
    resultMarker ? `result-marker-square result-marker-${resultMarker.tone}` : '',
    blunderMarker ? 'blunder-marker-square' : '',
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
      {blunderMarker && (
        <span className="blunder-marker" aria-label="Blunder: this move can lose material">
          <span aria-hidden="true">!</span>
        </span>
      )}
      {resultMarker && (
        <span className={`board-result-marker board-result-marker-${resultMarker.tone}`} aria-label={resultMarker.label}>
          <span aria-hidden="true">{resultMarker.icon}</span>
          <strong>{resultMarker.label}</strong>
        </span>
      )}
      {isLegalMove && <MoveHint isCapture={isCapture} />}
    </button>
  );
}
