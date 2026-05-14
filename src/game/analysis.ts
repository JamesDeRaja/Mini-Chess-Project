import { applyMove } from './applyMove.js';
import { isKingInCheck, isSquareAttacked } from './check.js';
import { BOARD_FILES, BOARD_RANKS } from './constants.js';
import { squareLabel } from './coordinates.js';
import { getOpponent, getStatusForTurn } from './gameStatus.js';
import { getAllLegalMoves } from './legalMoves.js';
import type { Board, Color, Move, MoveAnalysis, PieceType, PromotionPieceType } from './types.js';

export type BestMoveOptions = {
  board: Board;
  sideToMove: Color;
  legalMoves?: Move[];
  depth?: number;
  difficulty?: string;
};

type ScoredMove = {
  move: Move;
  score: number;
  immediateScore: number;
  followUpPenalty: number;
  allowsMovedPieceCapture: boolean;
  tieBreaker: number;
};

const analysisPieceValues: Record<PieceType, number> = {
  king: 0,
  queen: 900,
  rook: 500,
  bishop: 300,
  knight: 300,
  pawn: 100,
};

const pieceLetters: Record<PieceType, string> = {
  king: 'K',
  queen: 'Q',
  rook: 'R',
  bishop: 'B',
  knight: 'N',
  pawn: '',
};

function moveTieBreaker(move: Move): number {
  return move.from * 31 + move.to * 7 + (move.promotionPiece ? move.promotionPiece.charCodeAt(0) : 0);
}

function centerBonus(board: Board, move: Move): number {
  const target = board[move.to];
  const fileCenter = (BOARD_FILES - 1) / 2;
  const rankCenter = (BOARD_RANKS - 1) / 2;
  const distance = Math.abs(target.file - fileCenter) + Math.abs(target.rank - rankCenter);
  return Math.max(0, 10 - distance * 2);
}

function materialScore(board: Board, side: Color): number {
  return board.reduce((score, square) => {
    if (!square.piece) return score;
    const value = analysisPieceValues[square.piece.type];
    return square.piece.color === side ? score + value : score - value;
  }, 0);
}

function scoreAnalysisMoveImmediate(board: Board, move: Move): number {
  const nextBoard = applyMove(board, move);
  const enemyColor = getOpponent(move.piece.color);
  let score = centerBonus(board, move);

  if (getStatusForTurn(nextBoard, enemyColor) === `${move.piece.color}_won`) score += 100_000;
  if (isKingInCheck(nextBoard, enemyColor)) score += 800;
  if (move.capturedPiece) score += analysisPieceValues[move.capturedPiece.type];
  if (move.isPromotion) score += analysisPieceValues[move.promotionPiece ?? 'queen'];
  score += materialScore(nextBoard, move.piece.color) - materialScore(board, move.piece.color);

  if (isSquareAttacked(nextBoard, move.to, enemyColor)) {
    score -= Math.round(analysisPieceValues[move.piece.type] * 0.65);
  }

  if (move.piece.type === 'queen' || move.piece.type === 'rook') {
    const movedPieceStillThere = nextBoard[move.to]?.piece;
    if (movedPieceStillThere && isSquareAttacked(nextBoard, move.to, enemyColor)) {
      score -= Math.round(analysisPieceValues[move.piece.type] * 0.45);
    }
  }

  return score;
}


function responseCapturesMovedPiece(response: Move, move: Move): boolean {
  return response.to === move.to && Boolean(response.capturedPiece) && response.capturedPiece?.id === move.piece.id;
}

function scoreMoveWithFollowUp(board: Board, move: Move): ScoredMove {
  const nextBoard = applyMove(board, move);
  const enemyColor = getOpponent(move.piece.color);
  const immediateScore = scoreAnalysisMoveImmediate(board, move);
  const enemyMoves = getAllLegalMoves(nextBoard, enemyColor);
  let bestEnemyScore = 0;
  let allowsMovedPieceCapture = false;

  for (const enemyMove of enemyMoves) {
    const enemyScore = scoreAnalysisMoveImmediate(nextBoard, enemyMove);
    if (responseCapturesMovedPiece(enemyMove, move)) {
      allowsMovedPieceCapture = true;
      bestEnemyScore = Math.max(bestEnemyScore, enemyScore + analysisPieceValues[move.piece.type] * 0.35);
      continue;
    }
    bestEnemyScore = Math.max(bestEnemyScore, enemyScore);
  }

  const followUpPenalty = Math.round(bestEnemyScore * 0.92);
  const hangingPenalty = allowsMovedPieceCapture ? Math.round(analysisPieceValues[move.piece.type] * 0.75) : 0;

  return {
    move,
    score: immediateScore - followUpPenalty - hangingPenalty,
    immediateScore,
    followUpPenalty: followUpPenalty + hangingPenalty,
    allowsMovedPieceCapture,
    tieBreaker: moveTieBreaker(move),
  };
}

function getScoredMoves(board: Board, moves: Move[]): ScoredMove[] {
  return moves.map((move) => scoreMoveWithFollowUp(board, move)).sort((a, b) => b.score - a.score || a.tieBreaker - b.tieBreaker);
}

export function getBestMoveForPosition({ board, sideToMove, legalMoves }: BestMoveOptions): Move | null {
  const moves = legalMoves ?? getAllLegalMoves(board, sideToMove);
  if (moves.length === 0) return null;

  return getScoredMoves(board, moves)[0].move;
}

function promotionForMove(move: Partial<Pick<Move, 'isPromotion' | 'promotionPiece'>> & { promotion?: PromotionPieceType | null }): PromotionPieceType | null {
  if (move.promotion) return move.promotion;
  return move.isPromotion ? move.promotionPiece ?? 'queen' : null;
}

export function areSameMove(
  actual: (Partial<Pick<Move, 'isPromotion' | 'promotionPiece'>> & { from: number; to: number; promotion?: PromotionPieceType | null }),
  suggested: Pick<Move, 'from' | 'to' | 'isPromotion' | 'promotionPiece'> | null,
): boolean {
  if (!suggested) return false;
  return actual.from === suggested.from && actual.to === suggested.to && promotionForMove(actual) === promotionForMove(suggested);
}

export function getMoveNotation(move: Move | null): string {
  if (!move) return 'No legal move found';
  const capture = move.capturedPiece ? 'x' : '';
  const promotion = move.isPromotion ? '=Q' : '';
  return `${pieceLetters[move.piece.type]}${capture}${squareLabel(move.to % BOARD_FILES, Math.floor(move.to / BOARD_FILES))}${promotion}`;
}

export function analyzeMove(boardBeforeMove: Board, actualMove: { from: number; to: number; promotion?: PromotionPieceType | null; color: Color }): MoveAnalysis {
  const legalMoves = getAllLegalMoves(boardBeforeMove, actualMove.color);
  const scoredMoves = getScoredMoves(boardBeforeMove, legalMoves);
  const bestScoredMove = scoredMoves[0] ?? null;
  const worstScoredMove = scoredMoves.at(-1) ?? null;
  const actualScoredMove = scoredMoves.find(({ move }) => areSameMove(actualMove, move)) ?? null;
  const bestMove = bestScoredMove?.move ?? null;
  const isBestMove = areSameMove(actualMove, bestMove);
  const isWorstMove = Boolean(actualScoredMove && worstScoredMove && areSameMove(actualScoredMove.move, worstScoredMove.move) && scoredMoves.length > 1);
  const isBigDrop = Boolean(actualScoredMove && bestScoredMove && bestScoredMove.score - actualScoredMove.score >= 260);
  const isPieceHanging = Boolean(actualScoredMove?.allowsMovedPieceCapture && actualScoredMove.move.piece.type !== 'king');
  const isBlunder = !isBestMove && (isPieceHanging || isWorstMove || isBigDrop);
  const blunderReason = isPieceHanging && (isWorstMove || isBigDrop)
    ? 'worst_move_and_piece_hanging'
    : isPieceHanging
      ? 'piece_hanging'
      : isBlunder
        ? 'worst_move'
        : undefined;

  return {
    bestMove,
    isBestMove,
    isBlunder,
    blunderSquare: isBlunder ? actualMove.to : null,
    blunderReason,
  };
}
