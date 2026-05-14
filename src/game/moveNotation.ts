import { squareLabel } from './coordinates.js';
import type { MoveDelta, MoveRecord, PieceType, PromotionPieceType, SquareCoord } from './types.js';

export type HistoryMove = MoveDelta | MoveRecord;

export type MoveGroup = {
  moveNumber: number;
  white: HistoryMove | null;
  black: HistoryMove | null;
  whitePly: number | null;
  blackPly: number | null;
};

export type FormattedMoveNotation = {
  pieceIcon: string;
  text: string;
  isCapture: boolean;
  isCheck: boolean;
  isMate: boolean;
};

export const pieceNames: Record<PieceType, string> = {
  king: 'King',
  queen: 'Queen',
  rook: 'Rook',
  bishop: 'Bishop',
  knight: 'Knight',
  pawn: 'Pawn',
};

const promotionLabels: Record<PromotionPieceType, string> = {
  queen: 'Q',
  rook: 'R',
  bishop: 'B',
  knight: 'N',
};

function isDeltaMove(move: HistoryMove): move is MoveDelta {
  return 'to' in move && typeof move.to === 'object';
}

function coordToIndex(coord: SquareCoord): number {
  return coord.file + coord.rank * 5;
}

export function moveDestination(move: HistoryMove): string {
  const toIndex = isDeltaMove(move) ? coordToIndex(move.to) : move.to;
  return squareLabel(toIndex % 5, Math.floor(toIndex / 5));
}

function moveSan(move: HistoryMove): string {
  return isDeltaMove(move) ? move.san ?? '' : '';
}

function movePromotion(move: HistoryMove): PromotionPieceType | null | undefined {
  return isDeltaMove(move) ? move.promotion : move.promotion;
}

export function formatMoveNotation(move: HistoryMove): FormattedMoveNotation {
  const san = moveSan(move);
  const isMate = san.endsWith('#');
  const isCheck = !isMate && san.endsWith('+');
  const isCapture = Boolean(move.captured) || san.includes('x') || san.includes('×');
  const promotion = movePromotion(move);
  const suffix = `${promotion ? `=${promotionLabels[promotion]}` : ''}${isMate ? '#' : isCheck ? '+' : ''}`;

  return {
    pieceIcon: `/pieces/${move.color}-${move.piece}.png`,
    text: `${isCapture ? '× ' : ''}${moveDestination(move)}${suffix}`,
    isCapture,
    isCheck,
    isMate,
  };
}

export function groupMoveHistory(moves: HistoryMove[]): MoveGroup[] {
  return moves.reduce<MoveGroup[]>((groups, move, index) => {
    const groupIndex = Math.floor(index / 2);
    const group = groups[groupIndex] ?? {
      moveNumber: groupIndex + 1,
      white: null,
      black: null,
      whitePly: null,
      blackPly: null,
    };

    if (move.color === 'white') {
      group.white = move;
      group.whitePly = index + 1;
    } else {
      group.black = move;
      group.blackPly = index + 1;
    }

    groups[groupIndex] = group;
    return groups;
  }, []);
}
