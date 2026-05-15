import { useState } from 'react';
import { getPieceFallbackSymbol, getPieceImageSrc } from '../game/pieceAssets.js';
import type { Piece as ChessPiece } from '../game/types.js';

type PieceProps = {
  piece: ChessPiece;
  isDraggable?: boolean;
  isSelected?: boolean;
};

const loadedPieceImages = new Set<string>();
const failedPieceImages = new Set<string>();

function hasLoadedPieceImage(src: string) {
  return loadedPieceImages.has(src);
}

function hasFailedPieceImage(src: string) {
  return failedPieceImages.has(src);
}

export function Piece({ piece, isDraggable = false, isSelected = false }: PieceProps) {
  const [, refreshImageStatus] = useState(0);
  const pieceImageSrc = getPieceImageSrc(piece);
  const imageFailed = hasFailedPieceImage(pieceImageSrc);
  const imageLoaded = hasLoadedPieceImage(pieceImageSrc);
  const ariaLabel = `${piece.color} ${piece.type}`;
  const shouldShowFallback = imageFailed || !imageLoaded;

  return (
    <span
      className={`piece piece-wrapper piece-${piece.color} ${isSelected ? 'piece-selected' : ''}`}
      draggable={false}
      aria-label={ariaLabel}
      data-draggable={isDraggable ? 'true' : undefined}
      data-piece-id={piece.id}
      data-piece-type={piece.type}
    >
      {shouldShowFallback && (
        <span className="piece-fallback piece-loading-symbol" data-piece={piece.type} aria-hidden="true">{getPieceFallbackSymbol(piece)}</span>
      )}
      {!imageFailed && (
        <img
          className={`piece-img ${imageLoaded ? 'piece-img-loaded' : 'piece-img-loading'}`}
          data-piece={piece.type}
          src={pieceImageSrc}
          alt=""
          draggable={false}
          onLoad={() => {
            loadedPieceImages.add(pieceImageSrc);
            refreshImageStatus((statusVersion) => statusVersion + 1);
          }}
          onError={() => {
            failedPieceImages.add(pieceImageSrc);
            refreshImageStatus((statusVersion) => statusVersion + 1);
            if (import.meta.env.DEV) console.warn(`Could not load piece image: ${pieceImageSrc}`);
          }}
        />
      )}
    </span>
  );
}
