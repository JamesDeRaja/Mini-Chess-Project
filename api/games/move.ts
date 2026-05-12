import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { applyMove } from '../../src/game/applyMove.js';
import { BOARD_FILES, BOARD_RANKS } from '../../src/game/constants.js';
import { index } from '../../src/game/coordinates.js';
import { getOpponent, getStatusForTurn, isStalemate } from '../../src/game/gameStatus.js';
import { getCaptureScore } from '../../src/game/scoring.js';
import { getLegalMoves } from '../../src/game/legalMoves.js';
import { rebuildBoardFromHistory } from '../../src/game/moveDelta.js';
import { deriveBackRankCodeFromBoard, estimateMaterialScores } from '../../src/game/seed.js';
import type { Board, Color, GameStatus, MoveDelta, PromotionPieceType, SquareCoord } from '../../src/game/types.js';
import { safeSupabaseUpdate } from '../../src/multiplayer/safeSupabaseUpdate.js';
import { assessGameLifecycle, getActivityResetFields } from './lifecycle.js';
import { getServerSupabase } from './serverSupabase.js';

function getWinner(status: GameStatus): Color | null {
  if (status === 'white_won') return 'white';
  if (status === 'black_won') return 'black';
  return null;
}

function getResultType(status: GameStatus, board?: Board, turn?: Color): string | null {
  if (status === 'white_won' || status === 'black_won') return 'checkmate';
  if (status === 'draw') return board && turn && isStalemate(board, turn) ? 'stalemate' : 'draw';
  return null;
}

function parseCoord(value: unknown): SquareCoord | null {
  const coord = value as Partial<SquareCoord> | null;
  if (!coord || typeof coord.file !== 'number' || typeof coord.rank !== 'number') return null;
  if (!Number.isInteger(coord.file) || !Number.isInteger(coord.rank)) return null;
  if (coord.file < 0 || coord.file >= BOARD_FILES || coord.rank < 0 || coord.rank >= BOARD_RANKS) return null;
  return { file: coord.file, rank: coord.rank };
}

function parsePromotion(value: unknown): PromotionPieceType | undefined {
  return value === 'queen' || value === 'rook' || value === 'bishop' || value === 'knight' ? value : undefined;
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.status(405).send('Method not allowed');
    return;
  }

  const gameId = typeof request.body?.gameId === 'string' ? request.body.gameId : null;
  const playerId = typeof request.body?.playerId === 'string' ? request.body.playerId : null;
  const from = parseCoord(request.body?.from);
  const to = parseCoord(request.body?.to);
  const promotion = parsePromotion(request.body?.promotion);
  if (!gameId || !playerId || !from || !to) {
    response.status(400).send('Missing gameId, playerId, from, or to');
    return;
  }

  const supabase = getServerSupabase();
  const { data: game, error: fetchError } = await supabase.from('games').select('*').eq('id', gameId).single();
  if (fetchError || !game) {
    response.status(404).send(fetchError?.message ?? 'Game not found');
    return;
  }

  const lifecycleGame = await assessGameLifecycle(supabase, game);
  if (lifecycleGame.status === 'timeout') {
    response.status(200).json({ game: lifecycleGame });
    return;
  }

  if (lifecycleGame.status !== 'active') {
    response.status(403).send('Game is not active');
    return;
  }

  const playerColor: Color | null = lifecycleGame.white_player_id === playerId ? 'white' : lifecycleGame.black_player_id === playerId ? 'black' : null;
  if (!playerColor) {
    response.status(403).send('Player is not in this game');
    return;
  }

  if (lifecycleGame.turn !== playerColor) {
    response.status(403).send('It is not your turn');
    return;
  }

  const currentMoveHistory = Array.isArray(lifecycleGame.move_history) ? lifecycleGame.move_history : [];
  const fallbackBoard = Array.isArray(lifecycleGame.board) ? (lifecycleGame.board as Board) : null;
  const backRankCode = typeof lifecycleGame.back_rank_code === 'string' ? lifecycleGame.back_rank_code : deriveBackRankCodeFromBoard(fallbackBoard ?? []);
  const currentBoard = rebuildBoardFromHistory(currentMoveHistory, { backRankCode, fallbackBoard });
  const fromIndex = index(from.file, from.rank);
  const toIndex = index(to.file, to.rank);
  const movingPiece = currentBoard[fromIndex]?.piece;
  if (!movingPiece || movingPiece.color !== playerColor) {
    response.status(400).send('Illegal move');
    return;
  }

  const legalMove = getLegalMoves(currentBoard, fromIndex).find((move) => move.to === toIndex);
  if (!legalMove) {
    response.status(400).send('Illegal move');
    return;
  }
  if (promotion && legalMove.isPromotion) legalMove.promotionPiece = promotion;

  const nextBoard = applyMove(currentBoard, legalMove);
  const nextTurn = getOpponent(playerColor);
  const nextStatus = getStatusForTurn(nextBoard, nextTurn);
  const createdAt = new Date().toISOString();
  const moveDelta: MoveDelta = {
    id: randomUUID(),
    moveNumber: currentMoveHistory.length + 1,
    from,
    to,
    piece: legalMove.piece.type,
    color: legalMove.piece.color,
    captured: legalMove.capturedPiece?.type ?? null,
    capturedColor: legalMove.capturedPiece?.color ?? null,
    capturingSide: legalMove.capturedPiece ? legalMove.piece.color : null,
    captureScore: legalMove.capturedPiece ? getCaptureScore(legalMove.capturedPiece.type) : null,
    promotion: legalMove.promotionPiece ?? null,
    createdAt,
    playerId,
  };
  const moveHistory = [...currentMoveHistory, moveDelta];
  const materialScores = estimateMaterialScores(moveHistory);
  const moveCount = moveHistory.length;

  const updatePayload: Record<string, unknown> = {
    turn: nextTurn,
    status: nextStatus,
    move_history: moveHistory,
    last_move: moveDelta,
    move_count: moveCount,
    winner: getWinner(nextStatus),
    result_type: getResultType(nextStatus, nextBoard, nextTurn),
    draw_offer_by: null,
    total_moves: moveCount,
    white_score: materialScores.whiteScore,
    black_score: materialScores.blackScore,
    ...getActivityResetFields(new Date(createdAt)),
  };

  if (!backRankCode) updatePayload.board = nextBoard;

  const { data: updatedGame, error: updateError } = await safeSupabaseUpdate(
    supabase,
    gameId,
    updatePayload,
  );

  if (updateError || !updatedGame) {
    response.status(500).send(updateError?.message ?? 'Unable to update game');
    return;
  }

  response.status(200).json({ game: { ...updatedGame, last_move: moveDelta, move_count: moveCount } });
}
