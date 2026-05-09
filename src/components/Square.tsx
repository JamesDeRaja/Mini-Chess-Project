import type { DragEvent } from 'react';
import type { GameStatus, Square as ChessSquare } from '../game/types';
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
  gameStatus?: GameStatus;
  slideOffset?: { dx: number; dy: number };
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
  gameStatus,
  slideOffset,
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

  const resultOverlay: 'win' | 'loss' | 'draw' | undefined =
    (square.piece?.type === 'king' && gameStatus && gameStatus !== 'active' && gameStatus !== 'waiting')
      ? gameStatus === 'draw'
        ? 'draw'
        : (gameStatus === 'white_won') === (square.piece.color === 'white')
        ? 'win'
        : 'loss'
      : undefined;

  function handlePieceDragStart(event: DragEvent<HTMLDivElement>) {
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
      style={slideOffset ? { '--mv-dx': slideOffset.dx, '--mv-dy': slideOffset.dy } as React.CSSProperties : undefined}
    >
      <span className="coordinate-label">{coordinateLabel}</span>
      {square.piece && (
        <Piece
          key={square.piece.id}
          piece={square.piece}
          isDraggable={isInteractive}
          isSelected={isSelected}
          resultOverlay={resultOverlay}
          onDragStart={handlePieceDragStart}
          onDragEnd={() => setTimeout(() => document.querySelector('.piece-dragging')?.classList.remove('piece-dragging'), 0)}
        />
      )}
      {isLegalMove && <MoveHint isCapture={isCapture} />}
    </button>
  );
}
