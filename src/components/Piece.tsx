import type { DragEvent } from 'react';
import { pieceSymbols } from '../game/constants.js';
import type { Piece as ChessPiece } from '../game/types.js';

type PieceProps = {
  piece: ChessPiece;
  isDraggable?: boolean;
  isSelected?: boolean;
  onDragStart?: (event: DragEvent<HTMLSpanElement>) => void;
  onDragEnd?: () => void;
};

export function Piece({ piece, isDraggable = false, isSelected = false, onDragStart, onDragEnd }: PieceProps) {
  return (
    <span
      className={`piece piece-${piece.color} ${isSelected ? 'piece-selected' : ''}`}
      draggable={isDraggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      aria-label={`${piece.color} ${piece.type}`}
    >
      {pieceSymbols[piece.color][piece.type]}
    </span>
  );
}
