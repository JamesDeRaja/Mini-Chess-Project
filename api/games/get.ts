import type { VercelRequest, VercelResponse } from '@vercel/node';
import { assessGameLifecycle } from './lifecycle.js';
import { getServerSupabase } from './serverSupabase.js';

function getPlayerRole(game: Record<string, unknown>, playerId: string | null): 'white' | 'black' | 'spectator' {
  if (playerId && game.white_player_id === playerId) return 'white';
  if (playerId && game.black_player_id === playerId) return 'black';
  return 'spectator';
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    response.status(405).send('Method not allowed');
    return;
  }

  const gameId = typeof request.query.id === 'string' ? request.query.id : typeof request.body?.gameId === 'string' ? request.body.gameId : null;
  const playerId = typeof request.query.playerId === 'string' ? request.query.playerId : typeof request.body?.playerId === 'string' ? request.body.playerId : null;
  if (!gameId) {
    response.status(400).send('Missing gameId');
    return;
  }

  const supabase = getServerSupabase();
  const { data: game, error } = await supabase.from('games').select('*').eq('id', gameId).single();
  if (error || !game) {
    response.status(404).send(error?.message ?? 'Game not found');
    return;
  }

  const lifecycleGame = await assessGameLifecycle(supabase, game);
  response.status(200).json({ game: lifecycleGame, role: getPlayerRole(lifecycleGame, playerId) });
}
