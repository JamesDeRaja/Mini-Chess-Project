import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyMove, createMoveRecord } from '../../src/game/applyMove';
import { getOpponent, getStatusForTurn } from '../../src/game/gameStatus';
import { getLegalMoves } from '../../src/game/legalMoves';
import type { Move } from '../../src/game/types';
import { getServerSupabase } from './serverSupabase';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.status(405).send('Method not allowed');
    return;
  }

  const gameId = typeof request.body?.gameId === 'string' ? request.body.gameId : null;
  const playerId = typeof request.body?.playerId === 'string' ? request.body.playerId : null;
  const requestedMove = request.body?.move as Move | undefined;
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

  const legalMove = getLegalMoves(game.board, requestedMove.from).find((move) => move.to === requestedMove.to);
  if (!legalMove) {
    response.status(400).send('Illegal move');
    return;
  }

  const nextBoard = applyMove(game.board, legalMove);
  const nextTurn = getOpponent(game.turn);
  const nextStatus = getStatusForTurn(nextBoard, nextTurn);
  const moveHistory = [...game.move_history, createMoveRecord(legalMove)];

  const { data: updatedGame, error: updateError } = await supabase
    .from('games')
    .update({ board: nextBoard, turn: nextTurn, status: nextStatus, move_history: moveHistory })
    .eq('id', gameId)
    .select('*')
    .single();

  if (updateError) {
    response.status(500).send(updateError.message);
    return;
  }

  response.status(200).json({ game: updatedGame });
}
