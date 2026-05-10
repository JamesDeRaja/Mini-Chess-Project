import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getServerSupabase } from './serverSupabase.js';

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

  let role: 'white' | 'black' | 'spectator' = 'spectator';
  let updates: Record<string, string> = {};

  if (existingGame.white_player_id === playerId) role = 'white';
  else if (existingGame.black_player_id === playerId) role = 'black';
  else if (!existingGame.white_player_id) {
    role = 'white';
    updates = { white_player_id: playerId };
  } else if (!existingGame.black_player_id) {
    role = 'black';
    updates = { black_player_id: playerId, status: 'active' };
  }

  const nextWhitePlayerId = updates.white_player_id ?? existingGame.white_player_id;
  const nextBlackPlayerId = updates.black_player_id ?? existingGame.black_player_id;
  if (nextWhitePlayerId && nextBlackPlayerId && existingGame.status === 'waiting') {
    updates = { ...updates, status: 'active' };
  }

  if (Object.keys(updates).length > 0) {
    const { data: updatedGame, error: updateError } = await supabase
      .from('games')
      .update(updates)
      .eq('id', gameId)
      .select('*')
      .single();

    if (updateError) {
      response.status(500).send(updateError.message);
      return;
    }

    response.status(200).json({ game: updatedGame, role });
    return;
  }

  response.status(200).json({ game: existingGame, role });
}
