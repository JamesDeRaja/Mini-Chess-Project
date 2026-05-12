import { getOpponent } from './gameStatus.js';
import type { Color, GameStatus, MoveDelta, MoveRecord, PieceType } from './types.js';

export type ScoreResult = 'checkmate_win' | 'stalemate' | 'loss' | 'draw';

export type CaptureRecord = {
  capturedPiece: Exclude<PieceType, 'king'>;
  capturedColor: Color;
  capturingSide: Color;
  scoreValue: number;
  moveNumber: number;
};

export type ScoreBreakdown = {
  resultBonus: number;
  speedBonus: number;
  capturePoints: number;
  capturePenalty: number;
  totalScore: number;
  fullMoves: number;
  handicapBonus: number;
  captures: CaptureRecord[];
};

const captureScores: Partial<Record<PieceType, number>> = {
  queen: 25,
  rook: 15,
  bishop: 10,
  knight: 10,
  pawn: 3,
};

export function getCaptureScore(pieceType: PieceType | null | undefined): number {
  return pieceType ? captureScores[pieceType] ?? 0 : 0;
}

export function getCapturePenaltyScore(pieceType: PieceType | null | undefined): number {
  return Math.floor(getCaptureScore(pieceType) / 2);
}

function isScoredCapture(pieceType: PieceType | null | undefined): pieceType is Exclude<PieceType, 'king'> {
  return Boolean(pieceType && pieceType !== 'king' && getCaptureScore(pieceType) > 0);
}

export function getFullMoveCount(moveCount: number): number {
  return Math.ceil(Math.max(0, moveCount) / 2);
}

export function getMoveCaptureRecord(move: MoveRecord | MoveDelta, index: number): CaptureRecord | null {
  const capturedPiece = move.captured ?? null;
  if (!isScoredCapture(capturedPiece)) return null;
  const capturedColor = move.capturedColor ?? getOpponent(move.color);
  const capturingSide = move.capturingSide ?? move.color;
  const moveNumber = 'moveNumber' in move && typeof move.moveNumber === 'number' ? move.moveNumber : index + 1;
  return {
    capturedPiece,
    capturedColor,
    capturingSide,
    scoreValue: move.captureScore ?? getCaptureScore(capturedPiece),
    moveNumber,
  };
}

export function getCaptureRecords(moveHistory: Array<MoveRecord | MoveDelta>): CaptureRecord[] {
  return moveHistory.flatMap((move, index) => {
    const record = getMoveCaptureRecord(move, index);
    return record ? [record] : [];
  });
}

function getSpeedBonus(didWin: boolean, fullMoves: number): number {
  if (!didWin) return 0;
  return Math.max(0, 50 - Math.max(0, fullMoves - 1) * 3);
}

function getHandicapBonus(missingPieces: PieceType[] = []): number {
  return missingPieces.reduce((total, piece) => total + getCaptureScore(piece), 0);
}

export function getResultForSide(status: GameStatus, side: Color): ScoreResult {
  if (status === 'white_won') return side === 'white' ? 'checkmate_win' : 'loss';
  if (status === 'black_won') return side === 'black' ? 'checkmate_win' : 'loss';
  if (status === 'draw') return 'stalemate';
  return 'draw';
}

export function calculateGameScore({
  status,
  side,
  moveHistory,
  handicapPieces = [],
}: {
  status: GameStatus;
  side: Color;
  moveHistory: Array<MoveRecord | MoveDelta>;
  handicapPieces?: PieceType[];
}): ScoreBreakdown {
  const result = getResultForSide(status, side);
  const didWin = result === 'checkmate_win';
  const fullMoves = getFullMoveCount(moveHistory.length);
  const allCaptures = getCaptureRecords(moveHistory);
  const captures = allCaptures.filter((capture) => capture.capturingSide === side);
  const enemyCaptures = allCaptures.filter((capture) => capture.capturingSide !== side);
  const resultBonus = didWin ? 100 : result === 'stalemate' ? 20 : 0;
  const speedBonus = getSpeedBonus(didWin, fullMoves);
  const earnedCapturePoints = captures.reduce((total, capture) => total + capture.scoreValue, 0);
  const capturePenalty = enemyCaptures.reduce((total, capture) => total + getCapturePenaltyScore(capture.capturedPiece), 0);
  const capturePoints = earnedCapturePoints - capturePenalty;
  const handicapBonus = getHandicapBonus(handicapPieces);
  const totalScore = Math.max(1, resultBonus + speedBonus + capturePoints + handicapBonus);
  return { resultBonus, speedBonus, capturePoints, capturePenalty, totalScore, fullMoves, handicapBonus, captures };
}

export function isPlausibleScore(score: number, moves: number): boolean {
  return Number.isInteger(score) && Number.isInteger(moves) && score >= 0 && score <= 500 && moves >= 0 && moves <= 300;
}
