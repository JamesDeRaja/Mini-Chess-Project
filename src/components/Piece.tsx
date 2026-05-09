import { useState, type DragEvent } from 'react';
import { pieceSymbols } from '../game/constants';
import type { Piece as ChessPiece } from '../game/types';

const pieceImageMap: Record<string, Record<string, string>> = {
  white: {
    king:   '/pieces/white-king.svg',
    queen:  '/pieces/white-queen.svg',
    rook:   '/pieces/white-rook.svg',
    bishop: '/pieces/white-bishop.svg',
    knight: '/pieces/white-knight.svg',
    pawn:   '/pieces/white-pawn.svg',
  },
  black: {
    king:   '/pieces/black-king.svg',
    queen:  '/pieces/black-queen.svg',
    rook:   '/pieces/black-rook.svg',
    bishop: '/pieces/black-bishop.svg',
    knight: '/pieces/black-knight.svg',
    pawn:   '/pieces/black-pawn.svg',
  },
};

type PieceProps = {
  piece: ChessPiece;
  isDraggable?: boolean;
  isSelected?: boolean;
  onDragStart?: (event: DragEvent<HTMLSpanElement>) => void;
  onDragEnd?: () => void;
};

export function Piece({ piece, isDraggable = false, isSelected = false, onDragStart, onDragEnd }: PieceProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = pieceImageMap[piece.color]?.[piece.type];
  const useImg = src && !imgFailed;

  return (
    <span
      className={`piece piece-${piece.color} ${isSelected ? 'piece-selected' : ''}`}
      draggable={isDraggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      aria-label={`${piece.color} ${piece.type}`}
    >
      {useImg ? (
        <img
          src={src}
          alt={`${piece.color} ${piece.type}`}
          className={`piece-image piece-image-${piece.color}`}
          draggable={false}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span className="piece-unicode">{pieceSymbols[piece.color][piece.type]}</span>
      )}
    </span>
  );
}
