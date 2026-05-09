import type { DragEvent } from 'react';
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

  function handleDragStart(event: DragEvent<HTMLButtonElement>) {
    if (!isInteractive || !onDragStart || !onDragStart()) {
      event.preventDefault();
      return;
    }
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
      draggable={isInteractive && Boolean(square.piece)}
      onClick={onClick}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      aria-label={`Square ${coordinateLabel}`}
    >
      <span className="coordinate-label">{coordinateLabel}</span>
      {square.piece && <Piece piece={square.piece} />}
      {isLegalMove && <MoveHint isCapture={isCapture} />}
    </button>
  );
}
