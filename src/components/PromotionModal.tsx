import { PROMOTION_PIECES } from '../game/constants';
import type { PromotionPieceType } from '../game/types';

type PromotionModalProps = {
  isOpen: boolean;
  onSelect: (piece: PromotionPieceType) => void;
};

export function PromotionModal({ isOpen, onSelect }: PromotionModalProps) {
  if (!isOpen) return null;
  return (
    <div className="modal-backdrop">
      <div className="promotion-modal">
        <h2>Choose promotion</h2>
        <div className="promotion-options">
          {PROMOTION_PIECES.map((piece) => (
            <button key={piece} onClick={() => onSelect(piece)}>
              {piece}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
