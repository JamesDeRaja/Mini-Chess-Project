import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomInt } from 'node:crypto';
import { safeSupabaseUpdate } from '../../multiplayer/safeSupabaseUpdate.js';
import { assessGameLifecycle, getActivityResetFields } from './lifecycle.js';
import { getServerSupabase } from '../supabase.js';

function getPlayerRole(game: Record<string, unknown>, playerId: string): 'white' | 'black' | 'spectator' {
  if (game.white_player_id === playerId) return 'white';
  if (game.black_player_id === playerId) return 'black';
  return 'spectator';
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.status(405).send('Method not allowed');
    return;
  }

  const gameId = typeof request.query.id === 'string' ? request.query.id : null;
  const playerId = typeof request.body?.playerId === 'string' ? request.body.playerId : null;
  if (!gameId || !playerId) {
    response.status(400).send('Missing gameId or playerId');
    return;
  }

  const supabase = getServerSupabase();
  const { data: existingGame, error: fetchError } = await supabase.from('games').select('*').eq('id', gameId).single();
  if (fetchError || !existingGame) {
    response.status(404).send(fetchError?.message ?? 'Game not found');
    return;
  }

  const lifecycleGame = await assessGameLifecycle(supabase, existingGame);
  if (lifecycleGame.status === 'expired' || lifecycleGame.status === 'timeout') {
    response.status(200).json({ game: lifecycleGame, role: getPlayerRole(lifecycleGame, playerId) });
    return;
  }

  let role: 'white' | 'black' | 'spectator' = 'spectator';
  let updates: Record<string, unknown> = {};

  if (lifecycleGame.white_player_id === playerId) role = 'white';
  else if (lifecycleGame.black_player_id === playerId) role = 'black';
  else if (!lifecycleGame.white_player_id) {
    role = 'white';
    updates = { white_player_id: playerId };
  } else if (!lifecycleGame.black_player_id) {
    const existingPlayerId = typeof lifecycleGame.white_player_id === 'string' ? lifecycleGame.white_player_id : null;
    const joiningPlayerIsWhite = randomInt(2) === 0;
    role = joiningPlayerIsWhite ? 'white' : 'black';
    updates = joiningPlayerIsWhite && existingPlayerId
      ? { white_player_id: playerId, black_player_id: existingPlayerId, status: 'active', ...getActivityResetFields() }
      : { black_player_id: playerId, status: 'active', ...getActivityResetFields() };
  }

  const nextWhitePlayerId = updates.white_player_id ?? lifecycleGame.white_player_id;
  const nextBlackPlayerId = updates.black_player_id ?? lifecycleGame.black_player_id;
  if (nextWhitePlayerId && nextBlackPlayerId && lifecycleGame.status === 'waiting') {
    updates = {
      ...updates,
      status: 'active',
      turn: lifecycleGame.turn ?? 'white',
      ...getActivityResetFields(),
    };
  }

  if (Object.keys(updates).length > 0) {
    const { data: updatedGame, error: updateError } = await safeSupabaseUpdate(
      supabase,
      gameId,
      updates,
    );

    if (updateError) {
      response.status(500).send(updateError.message);
      return;
    }

    response.status(200).json({ game: updatedGame, role });
    return;
  }

  response.status(200).json({ game: lifecycleGame, role });
}
