import type { DragEvent } from 'react';
import type { Square as ChessSquare } from '../game/types.js';
import { Piece } from './Piece.js';
import { MoveHint } from './MoveHint.js';

type SquareProps = {
  square: ChessSquare;
  isSelected: boolean;
  isLegalMove: boolean;
  isCapture: boolean;
  isLastMove: boolean;
  isKingInCheck: boolean;
  isInteractive: boolean;
  isBoardSelected: boolean;
  coordinateLabel: string;
  onClick: () => void;
  onDragStart?: () => boolean;
  onDrop?: () => void;
};

export function Square({
  square,
  isSelected,
  isLegalMove,
  isCapture,
  isLastMove,
  isKingInCheck,
  isInteractive,
  isBoardSelected,
  coordinateLabel,
  onClick,
  onDragStart,
  onDrop,
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
    isKingInCheck ? 'king-in-check' : '',
  ]
    .filter(Boolean)
    .join(' ');

  function handlePieceDragStart(event: DragEvent<HTMLSpanElement>) {
    if (!isInteractive || !onDragStart || !onDragStart()) {
      event.preventDefault();
      return;
    }
    event.currentTarget.classList.add('piece-dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `${square.file},${square.rank}`);
  }

  function handleDragOver(event: DragEvent<HTMLButtonElement>) {
    if (!isInteractive || !onDrop) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = isLegalMove ? 'move' : 'none';
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    if (!isInteractive || !onDrop) return;
    event.preventDefault();
    onDrop();
  }

  return (
    <button
      className={className}
      onClick={onClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      role="gridcell"
      tabIndex={isInteractive || isBoardSelected || square.piece ? 0 : -1}
      aria-label={stateLabel ? `${pieceLabel}, ${stateLabel}` : pieceLabel}
      aria-pressed={isSelected}
    >
      {square.piece && (
        <Piece
          piece={square.piece}
          isDraggable={isInteractive}
          isSelected={isSelected}
          onDragStart={handlePieceDragStart}
          onDragEnd={() => setTimeout(() => document.querySelector('.piece-dragging')?.classList.remove('piece-dragging'), 0)}
        />
      )}
      {isLegalMove && <MoveHint isCapture={isCapture} />}
    </button>
  );
}
