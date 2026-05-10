import { useState, type DragEvent } from 'react';
import { getPieceFallbackSymbol, getPieceImageSrc } from '../game/pieceAssets.js';
import type { Piece as ChessPiece } from '../game/types.js';

type PieceProps = {
  piece: ChessPiece;
  isDraggable?: boolean;
  isSelected?: boolean;
  onDragStart?: (event: DragEvent<HTMLSpanElement>) => void;
  onDragEnd?: () => void;
};

export function Piece({ piece, isDraggable = false, isSelected = false, onDragStart, onDragEnd }: PieceProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const pieceImageSrc = getPieceImageSrc(piece);
  const ariaLabel = `${piece.color} ${piece.type}`;

  return (
    <span
      className={`piece piece-${piece.color} piece-${piece.type} ${isSelected ? 'piece-selected' : ''}`}
      draggable={isDraggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      aria-label={ariaLabel}
    >
      {imageFailed ? (
        <span className="piece-fallback" aria-hidden="true">{getPieceFallbackSymbol(piece)}</span>
      ) : (
        <img
          className="piece-img"
          src={pieceImageSrc}
          alt=""
          draggable={false}
          onError={() => {
            setImageFailed(true);
            if (import.meta.env.DEV) console.warn(`Could not load piece image: ${pieceImageSrc}`);
          }}
        />
      )}
    </span>
  );
}
