import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyMove, createMoveRecord } from '../../src/game/applyMove.js';
import { getOpponent, getStatusForTurn } from '../../src/game/gameStatus.js';
import { getLegalMoves } from '../../src/game/legalMoves.js';
import { estimateMaterialScores } from '../../src/game/seed.js';
import type { Color, GameStatus, Move } from '../../src/game/types.js';
import { safeSupabaseUpdate } from '../../src/multiplayer/safeSupabaseUpdate.js';
import { getServerSupabase } from './serverSupabase.js';

function getWinner(status: GameStatus): Color | null {
  if (status === 'white_won') return 'white';
  if (status === 'black_won') return 'black';
  return null;
}

function getResultType(status: GameStatus): string | null {
  if (status === 'white_won' || status === 'black_won') return 'checkmate';
  if (status === 'draw') return 'draw';
  return null;
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.status(405).send('Method not allowed');
    return;
  }

  const gameId = typeof request.body?.gameId === 'string' ? request.body.gameId : null;
  const playerId = typeof request.body?.playerId === 'string' ? request.body.playerId : null;
  const requestedMove = request.body?.move as Move | undefined;
  const clientMoveId = typeof request.body?.clientMoveId === 'string' ? request.body.clientMoveId : undefined;
  const moveNumber = typeof request.body?.moveNumber === 'number' ? request.body.moveNumber : undefined;
  const previousStateVersion = typeof request.body?.previousStateVersion === 'number' ? request.body.previousStateVersion : undefined;
  if (!gameId || !playerId || !requestedMove) {
    response.status(400).send('Missing gameId, playerId, or move');
    return;
  }

  const supabase = getServerSupabase();
  const { data: game, error: fetchError } = await supabase.from('games').select('*').eq('id', gameId).single();
  if (fetchError || !game) {
    response.status(404).send(fetchError?.message ?? 'Game not found');
    return;
  }

  const currentPlayerId = game.turn === 'white' ? game.white_player_id : game.black_player_id;
  if (game.status !== 'active' || currentPlayerId !== playerId) {
    response.status(403).send('It is not your turn');
    return;
  }

  const currentMoveHistory = game.move_history ?? [];
  if (typeof previousStateVersion === 'number' && previousStateVersion !== currentMoveHistory.length) {
    response.status(409).send('Board state changed');
    return;
  }

  if (typeof moveNumber === 'number' && moveNumber !== currentMoveHistory.length + 1) {
    response.status(409).send('Move number mismatch');
    return;
  }

  const legalMove = getLegalMoves(game.board, requestedMove.from).find((move) => move.to === requestedMove.to);
  if (!legalMove) {
    response.status(400).send('Illegal move');
    return;
  }

  const nextBoard = applyMove(game.board, legalMove);
  const nextTurn = getOpponent(game.turn);
  const nextStatus = getStatusForTurn(nextBoard, nextTurn);
  const moveHistory = [...currentMoveHistory, createMoveRecord(legalMove, { clientMoveId, playerId })];
  const materialScores = estimateMaterialScores(moveHistory);

  const { data: updatedGame, error: updateError } = await safeSupabaseUpdate(
    supabase,
    gameId,
    {
      board: nextBoard,
      turn: nextTurn,
      status: nextStatus,
      move_history: moveHistory,
      winner: getWinner(nextStatus),
      result_type: getResultType(nextStatus),
      total_moves: moveHistory.length,
      white_score: materialScores.whiteScore,
      black_score: materialScores.blackScore,
      updated_at: new Date().toISOString(),
    },
  );

  if (updateError) {
    response.status(500).send(updateError.message);
    return;
  }

  response.status(200).json({ game: updatedGame });
}
