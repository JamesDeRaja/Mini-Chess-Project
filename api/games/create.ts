import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createInitialBoard } from '../../src/game/createInitialBoard';
import { getServerSupabase } from './serverSupabase';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.status(405).send('Method not allowed');
    return;
  }

  const playerId = typeof request.body?.playerId === 'string' ? request.body.playerId : null;
  if (!playerId) {
    response.status(400).send('Missing playerId');
    return;
  }

  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('games')
    .insert({
      board: createInitialBoard(),
      turn: 'white',
      status: 'waiting',
      white_player_id: playerId,
      black_player_id: null,
      move_history: [],
    })
    .select('id')
    .single();

  if (error) {
    response.status(500).send(error.message);
    return;
  }

  response.status(200).json({ gameId: data.id });
}
