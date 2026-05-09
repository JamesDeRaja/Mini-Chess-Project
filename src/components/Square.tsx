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
  coordinateLabel,
  onClick,
  onDragStart,
  onDrop,
}: SquareProps) {
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
      aria-label={`Square ${coordinateLabel}`}
    >
      <span className="coordinate-label">{coordinateLabel}</span>
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
