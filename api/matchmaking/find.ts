import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createInitialBoard } from '../../src/game/createInitialBoard.js';
import { validateSeedInput } from '../../src/game/seed.js';
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

type MatchmakingGameRow = {
  id: string;
  status: 'waiting' | 'active';
  white_player_id: string | null;
  black_player_id: string | null;
};

type ServerSupabase = ReturnType<typeof getServerSupabase>;

function getString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getGamePayload(playerId: string, seed: string, backRankCode: string) {
  return {
    board: createInitialBoard({ backRankCode }),
    turn: 'white',
    status: 'waiting',
    white_player_id: playerId,
    black_player_id: null,
    move_history: [],
    seed,
    seed_source: seed.startsWith('daily-') ? 'daily_matchmaking' : seed.startsWith('random-') ? 'random_matchmaking' : 'custom_matchmaking',
    back_rank_code: backRankCode,
    round_number: 1,
    total_moves: 0,
    white_score: 0,
    black_score: 0,
  };
}

async function findMatchUsingGamesTable(supabase: ServerSupabase, playerId: string, seed: string, backRankCode: string) {
  const { data: existingRows, error: existingError } = await supabase
    .from('games')
    .select('id, status, white_player_id, black_player_id')
    .eq('white_player_id', playerId)
    .eq('seed', seed)
    .in('status', ['waiting', 'active'])
    .order('created_at', { ascending: false })
    .limit(1);

  if (existingError) {
    return { status: 'unavailable' as const, message: 'Matchmaking is not available. Use Invite Friend for now.' };
  }

  const existing = existingRows?.[0] as MatchmakingGameRow | undefined;
  if (existing?.status === 'active' && existing.black_player_id) {
    return { status: 'matched' as const, gameId: existing.id };
  }
  if (existing?.status === 'waiting') {
    return { status: 'waiting' as const, queueId: existing.id, seed, backRankCode };
  }

  const { data: opponentRows, error: opponentError } = await supabase
    .from('games')
    .select('id')
    .eq('seed', seed)
    .eq('status', 'waiting')
    .is('black_player_id', null)
    .neq('white_player_id', playerId)
    .order('created_at', { ascending: true })
    .limit(1);

  if (opponentError) {
    return { status: 'unavailable' as const, message: 'Matchmaking is not available. Use Invite Friend for now.' };
  }

  const opponent = opponentRows?.[0] as Pick<MatchmakingGameRow, 'id'> | undefined;
  if (opponent) {
    const { data: matchedGame, error: matchError } = await supabase
      .from('games')
      .update({ black_player_id: playerId, status: 'active' })
      .eq('id', opponent.id)
      .eq('status', 'waiting')
      .is('black_player_id', null)
      .select('id')
      .single();

    if (matchError || !matchedGame) {
      return { status: 'unavailable' as const, message: 'Unable to claim the waiting match. Please try again.' };
    }

    return { status: 'matched' as const, gameId: matchedGame.id as string };
  }

  const { data: waitingGame, error: insertError } = await safeSupabaseInsert<{ id: string }>(
    supabase,
    getGamePayload(playerId, seed, backRankCode),
    'id',
  );

  if (insertError || !waitingGame) {
    return { status: 'unavailable' as const, message: 'Unable to create a waiting match. Use Invite Friend for now.' };
  }

  return { status: 'waiting' as const, queueId: waitingGame.id, seed, backRankCode };
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.status(405).send('Method not allowed');
    return;
  }

  const playerId = getString(request.body?.playerId);
  const seedValidation = request.body?.seed ? validateSeedInput(String(request.body.seed)) : null;
  const seed = seedValidation?.ok ? seedValidation.normalizedSeed : null;
  const backRankCode = getString(request.body?.backRankCode) ?? (seedValidation?.ok ? seedValidation.backRankCode : null);
  if (!playerId || !seedValidation) {
    response.status(400).send('Missing playerId, seed, or backRankCode');
    return;
  }
  if (!seedValidation.ok || !seed || !backRankCode) {
    response.status(400).send(seedValidation.ok ? 'Missing playerId, seed, or backRankCode' : seedValidation.error);
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
    response.status(200).json(await findMatchUsingGamesTable(supabase, playerId, seed, backRankCode));
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
    response.status(200).json(await findMatchUsingGamesTable(supabase, playerId, seed, backRankCode));
    return;
  }

  if (opponent) {
    const opponentRow = opponent as QueueRow;
    const { data: game, error: gameError } = await safeSupabaseInsert<{ id: string }>(
      supabase,
      {
        ...getGamePayload(opponentRow.player_id, seed, backRankCode),
        status: 'active',
        black_player_id: playerId,
        match_id: opponentRow.id,
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
    response.status(200).json(await findMatchUsingGamesTable(supabase, playerId, seed, backRankCode));
    return;
  }

  response.status(200).json({ status: 'waiting', queueId: waitingRow.id, seed, backRankCode });
}
