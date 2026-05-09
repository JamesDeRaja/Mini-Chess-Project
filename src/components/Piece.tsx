import type { DragEvent } from 'react';
import { PieceSvg } from './PieceSvg';
import type { Piece as ChessPiece } from '../game/types';

type PieceProps = {
  piece: ChessPiece;
  isDraggable?: boolean;
  isSelected?: boolean;
  onDragStart?: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd?: () => void;
};

export function Piece({ piece, isDraggable = false, isSelected = false, onDragStart, onDragEnd }: PieceProps) {
  return (
    <div
      className={`piece ${isSelected ? 'piece-selected' : ''}`}
      draggable={isDraggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      aria-label={`${piece.color} ${piece.type}`}
    >
      <PieceSvg color={piece.color} type={piece.type} />
    </div>
  );
}
