import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createInitialBoard } from '../../src/game/createInitialBoard.js';
import { backRankCodeFromSeed, normalizeSeed } from '../../src/game/seed.js';
import { safeSupabaseInsert } from '../../src/multiplayer/safeSupabaseInsert.js';
import { getServerSupabase } from '../games/serverSupabase.js';

type QueueRow = {
  id: string;
  player_id: string;
  seed: string;
  back_rank_code: string;
  status: 'waiting' | 'matched' | 'cancelled' | 'expired';
  game_id?: string | null;
};

function getString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.status(405).send('Method not allowed');
    return;
  }

  const playerId = getString(request.body?.playerId);
  const seed = request.body?.seed ? normalizeSeed(String(request.body.seed)) : null;
  const backRankCode = getString(request.body?.backRankCode) ?? (seed ? backRankCodeFromSeed(seed) : null);
  if (!playerId || !seed || !backRankCode) {
    response.status(400).send('Missing playerId, seed, or backRankCode');
    return;
  }

  const supabase = getServerSupabase();

  const { data: existingRows, error: existingError } = await supabase
    .from('matchmaking_queue')
    .select('*')
    .eq('player_id', playerId)
    .eq('seed', seed)
    .in('status', ['waiting', 'matched'])
    .order('created_at', { ascending: false })
    .limit(1);

  if (existingError) {
    response.status(200).json({ status: 'unavailable', message: 'Matchmaking queue is not configured yet. Use Invite Friend for now.' });
    return;
  }

  const existing = existingRows?.[0] as QueueRow | undefined;
  if (existing?.status === 'matched' && existing.game_id) {
    response.status(200).json({ status: 'matched', gameId: existing.game_id });
    return;
  }

  const { data: opponent, error: opponentError } = await supabase
    .from('matchmaking_queue')
    .select('*')
    .eq('seed', seed)
    .eq('status', 'waiting')
    .neq('player_id', playerId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (opponentError) {
    response.status(200).json({ status: 'unavailable', message: 'Matchmaking queue is not available. Use Invite Friend for now.' });
    return;
  }

  if (opponent) {
    const opponentRow = opponent as QueueRow;
    const { data: game, error: gameError } = await safeSupabaseInsert<{ id: string }>(
      supabase,
      {
        board: createInitialBoard({ backRankCode }),
        turn: 'white',
        status: 'active',
        white_player_id: opponentRow.player_id,
        black_player_id: playerId,
        move_history: [],
        seed,
        seed_source: seed.startsWith('daily-') ? 'daily_matchmaking' : 'custom_matchmaking',
        back_rank_code: backRankCode,
        match_id: opponentRow.id,
        round_number: 1,
        total_moves: 0,
        white_score: 0,
        black_score: 0,
      },
      'id',
    );

    if (gameError || !game) {
      response.status(500).send(gameError?.message ?? 'Unable to create matched game');
      return;
    }

    await supabase.from('matchmaking_queue').update({ status: 'matched', game_id: game.id }).eq('id', opponentRow.id);
    if (existing) {
      await supabase.from('matchmaking_queue').update({ status: 'matched', game_id: game.id }).eq('id', existing.id);
    } else {
      await supabase.from('matchmaking_queue').insert({ player_id: playerId, seed, back_rank_code: backRankCode, status: 'matched', game_id: game.id });
    }

    response.status(200).json({ status: 'matched', gameId: game.id });
    return;
  }

  if (existing?.status === 'waiting') {
    response.status(200).json({ status: 'waiting', queueId: existing.id, seed, backRankCode });
    return;
  }

  const { data: waitingRow, error: insertError } = await supabase
    .from('matchmaking_queue')
    .insert({ player_id: playerId, seed, back_rank_code: backRankCode, status: 'waiting' })
    .select('id')
    .single();

  if (insertError || !waitingRow) {
    response.status(200).json({ status: 'unavailable', message: 'Matchmaking queue is not configured yet. Use Invite Friend for now.' });
    return;
  }

  response.status(200).json({ status: 'waiting', queueId: waitingRow.id, seed, backRankCode });
}
