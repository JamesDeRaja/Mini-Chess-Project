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

type ScoredAnalysisMove = {
  move: Move;
  score: number;
  bestReply: Move | null;
  replyCapturesMovedPiece: boolean;
  tieBreaker: number;
};

const analysisPieceValues: Record<PieceType, number> = {
  king: 20_000,
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

const BLUNDER_SCORE_DROP = 260;
const WORST_MOVE_SCORE_SPREAD = 160;

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

function materialScore(board: Board, perspective: Color): number {
  return board.reduce((score, square) => {
    if (!square.piece) return score;
    const value = analysisPieceValues[square.piece.type];
    return square.piece.color === perspective ? score + value : score - value;
  }, 0);
}

function activityScore(board: Board, perspective: Color): number {
  let score = 0;
  const fileCenter = (BOARD_FILES - 1) / 2;
  const rankCenter = (BOARD_RANKS - 1) / 2;

  for (const square of board) {
    if (!square.piece || square.piece.type === 'king') continue;
    const distance = Math.abs(square.file - fileCenter) + Math.abs(square.rank - rankCenter);
    const bonus = Math.max(0, 8 - distance * 1.5);
    score += square.piece.color === perspective ? bonus : -bonus;
  }

  return score;
}

function gameStatusScore(board: Board, perspective: Color): number | null {
  const opponent = getOpponent(perspective);
  const opponentStatus = getStatusForTurn(board, opponent);
  if (opponentStatus === `${perspective}_won`) return 100_000;
  if (opponentStatus === 'draw') return 0;

  const perspectiveStatus = getStatusForTurn(board, perspective);
  if (perspectiveStatus === `${opponent}_won`) return -100_000;
  if (perspectiveStatus === 'draw') return 0;

  return null;
}

function evaluateBoard(board: Board, perspective: Color): number {
  const statusScore = gameStatusScore(board, perspective);
  if (statusScore !== null) return statusScore;

  const opponent = getOpponent(perspective);
  let score = materialScore(board, perspective) + activityScore(board, perspective);
  if (isKingInCheck(board, opponent)) score += 55;
  if (isKingInCheck(board, perspective)) score -= 55;
  return score;
}

function immediateTacticalScore(board: Board, move: Move): number {
  const nextBoard = applyMove(board, move);
  const enemyColor = getOpponent(move.piece.color);
  let score = centerBonus(board, move);

  if (getStatusForTurn(nextBoard, enemyColor) === `${move.piece.color}_won`) score += 100_000;
  if (isKingInCheck(nextBoard, enemyColor)) score += 80;
  if (move.capturedPiece) score += analysisPieceValues[move.capturedPiece.type];
  if (move.isPromotion) score += analysisPieceValues[move.promotionPiece ?? 'queen'];

  if (isSquareAttacked(nextBoard, move.to, enemyColor)) {
    score -= Math.round(analysisPieceValues[move.piece.type] * 0.35);
  }

  return score;
}

function scoreAnalysisMove(board: Board, move: Move, depth = 2): ScoredAnalysisMove {
  const nextBoard = applyMove(board, move);
  const sideToMove = move.piece.color;
  const opponent = getOpponent(sideToMove);
  const movedPieceId = nextBoard[move.to]?.piece?.id ?? move.piece.id;
  const statusScore = gameStatusScore(nextBoard, sideToMove);
  const tieBreaker = moveTieBreaker(move);

  if (statusScore !== null || depth <= 1) {
    const score = (statusScore ?? evaluateBoard(nextBoard, sideToMove)) + immediateTacticalScore(board, move) * 0.18;
    return { move, score, bestReply: null, replyCapturesMovedPiece: false, tieBreaker };
  }

  const replies = getAllLegalMoves(nextBoard, opponent);
  if (replies.length === 0) {
    return { move, score: evaluateBoard(nextBoard, sideToMove) + immediateTacticalScore(board, move) * 0.18, bestReply: null, replyCapturesMovedPiece: false, tieBreaker };
  }

  const replyOutcomes = replies.map((reply) => {
    const boardAfterReply = applyMove(nextBoard, reply);
    const replyCapturesMovedPiece = reply.capturedPiece?.id === movedPieceId;
    let score = evaluateBoard(boardAfterReply, sideToMove);

    if (replyCapturesMovedPiece) {
      score -= Math.round(analysisPieceValues[move.piece.type] * 0.28);
    }

    return {
      reply,
      score,
      replyCapturesMovedPiece,
      tieBreaker: moveTieBreaker(reply),
    };
  }).sort((a, b) => a.score - b.score || a.tieBreaker - b.tieBreaker);

  const bestReplyForOpponent = replyOutcomes[0];
  const score = bestReplyForOpponent.score + immediateTacticalScore(board, move) * 0.18;
  return {
    move,
    score,
    bestReply: bestReplyForOpponent.reply,
    replyCapturesMovedPiece: bestReplyForOpponent.replyCapturesMovedPiece,
    tieBreaker,
  };
}

function rankAnalysisMoves(board: Board, moves: Move[], depth = 2): ScoredAnalysisMove[] {
  return moves
    .map((move) => scoreAnalysisMove(board, move, depth))
    .sort((a, b) => b.score - a.score || a.tieBreaker - b.tieBreaker);
}

export function getBestMoveForPosition({ board, sideToMove, legalMoves, depth = 2 }: BestMoveOptions): Move | null {
  const moves = legalMoves ?? getAllLegalMoves(board, sideToMove);
  if (moves.length === 0) return null;

  return rankAnalysisMoves(board, moves, depth)[0].move;
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
  const promotion = move.isPromotion ? `=${pieceLetters[move.promotionPiece ?? 'queen']}` : '';
  return `${pieceLetters[move.piece.type]}${capture}${squareLabel(move.to % BOARD_FILES, Math.floor(move.to / BOARD_FILES))}${promotion}`;
}

export function analyzeMove(boardBeforeMove: Board, actualMove: { from: number; to: number; promotion?: PromotionPieceType | null; color: Color }): MoveAnalysis {
  const legalMoves = getAllLegalMoves(boardBeforeMove, actualMove.color);
  const rankedMoves = rankAnalysisMoves(boardBeforeMove, legalMoves);
  const bestCandidate = rankedMoves[0] ?? null;
  const worstCandidate = rankedMoves.at(-1) ?? null;
  const actualCandidate = rankedMoves.find(({ move }) => areSameMove(actualMove, move)) ?? null;
  const bestMove = bestCandidate?.move ?? null;
  const bestScore = bestCandidate?.score ?? 0;
  const actualScore = actualCandidate?.score ?? bestScore;
  const worstScore = worstCandidate?.score ?? actualScore;
  const scoreDrop = Math.max(0, Math.round(bestScore - actualScore));
  const isActualWorstMove = Boolean(actualCandidate && worstCandidate && areSameMove(actualCandidate.move, worstCandidate.move) && bestScore - worstScore >= WORST_MOVE_SCORE_SPREAD);
  const allowsFollowUpCapture = Boolean(actualCandidate?.replyCapturesMovedPiece);
  const isBlunder = Boolean(actualCandidate && !areSameMove(actualMove, bestMove) && (scoreDrop >= BLUNDER_SCORE_DROP || isActualWorstMove || allowsFollowUpCapture));

  return {
    bestMove,
    isBestMove: areSameMove(actualMove, bestMove),
    isBlunder,
    blunderSquare: isBlunder ? actualMove.to : null,
    bestReply: actualCandidate?.bestReply ?? null,
    scoreDrop,
  };
}
