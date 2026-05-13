import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getServerSupabase } from '../supabase.js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.status(405).send('Method not allowed');
    return;
  }

  const playerId = typeof request.body?.playerId === 'string' ? request.body.playerId : null;
  const queueId = typeof request.body?.queueId === 'string' ? request.body.queueId : null;
  if (!playerId) {
    response.status(400).send('Missing playerId');
    return;
  }

  const supabase = getServerSupabase();
  let query = supabase.from('matchmaking_queue').update({ status: 'cancelled' }).eq('player_id', playerId).eq('status', 'waiting');
  if (queueId) query = query.eq('id', queueId);
  const { error } = await query;

  if (!error) {
    response.status(200).json({ ok: true });
    return;
  }

  let deleteQuery = supabase.from('games').delete().eq('white_player_id', playerId).eq('status', 'waiting').is('black_player_id', null);
  if (queueId) deleteQuery = deleteQuery.eq('id', queueId);
  const { error: deleteError } = await deleteQuery;

  if (deleteError) {
    response.status(200).json({ ok: false, message: 'Matchmaking queue is not configured.' });
    return;
  }

  response.status(200).json({ ok: true });
}
