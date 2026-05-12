import { useState } from 'react';
import { getPieceFallbackSymbol, getPieceImageSrc } from '../game/pieceAssets.js';
import type { Piece as ChessPiece } from '../game/types.js';

type PieceProps = {
  piece: ChessPiece;
  isDraggable?: boolean;
  isSelected?: boolean;
};

export function Piece({ piece, isDraggable = false, isSelected = false }: PieceProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const pieceImageSrc = getPieceImageSrc(piece);
  const ariaLabel = `${piece.color} ${piece.type}`;

  return (
    <span
      className={`piece piece-wrapper piece-${piece.color} ${isSelected ? 'piece-selected' : ''}`}
      draggable={false}
      aria-label={ariaLabel}
      data-draggable={isDraggable ? 'true' : undefined}
      data-piece-id={piece.id}
      data-piece-type={piece.type}
    >
      <span className={imageLoaded && !imageFailed ? 'piece-fallback piece-fallback-hidden' : 'piece-fallback'} data-piece={piece.type} aria-hidden="true">{getPieceFallbackSymbol(piece)}</span>
      {!imageFailed && (
        <img
          className={imageLoaded ? 'piece-img piece-img-loaded' : 'piece-img'}
          data-piece={piece.type}
          src={pieceImageSrc}
          alt=""
          draggable={false}
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setImageFailed(true);
            if (import.meta.env.DEV) console.warn(`Could not load piece image: ${pieceImageSrc}`);
          }}
        />
      )}
    </span>
  );
}
