import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createInitialBoard } from '../../game/createInitialBoard.js';
import { isValidBackRankCode, validateSeedInput } from '../../game/seed.js';
import { safeSupabaseInsert } from '../../multiplayer/safeSupabaseInsert.js';
import { getServerSupabase } from '../supabase.js';

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
  seed?: string | null;
  back_rank_code?: string | null;
};

type ServerSupabase = ReturnType<typeof getServerSupabase>;

function getString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getGamePayload(whitePlayerId: string, seed: string, backRankCode: string, blackPlayerId: string | null = null, status: 'waiting' | 'active' = 'waiting') {
  return {
    board: createInitialBoard({ backRankCode }),
    turn: 'white',
    status,
    white_player_id: whitePlayerId,
    black_player_id: blackPlayerId,
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


const MATCHMAKING_STALE_MINUTES = 5;
const MAX_PLAYER_WAITING_ROWS = 1;

function minutesAgoIso(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

async function cleanupMatchmakingQueue(supabase: ServerSupabase, playerId: string) {
  const staleCutoff = minutesAgoIso(MATCHMAKING_STALE_MINUTES);

  await supabase
    .from('matchmaking_queue')
    .update({ status: 'expired' })
    .eq('status', 'waiting')
    .lt('created_at', staleCutoff);

  await supabase
    .from('matchmaking_queue')
    .update({ status: 'expired' })
    .eq('status', 'matched')
    .is('game_id', null)
    .lt('created_at', staleCutoff);

  const { data: playerRows } = await supabase
    .from('matchmaking_queue')
    .select('id, status')
    .eq('player_id', playerId)
    .eq('status', 'waiting')
    .order('created_at', { ascending: false });

  const extraWaitingIds = (playerRows ?? [])
    .slice(MAX_PLAYER_WAITING_ROWS)
    .map((row) => String(row.id))
    .filter(Boolean);

  if (extraWaitingIds.length > 0) {
    await supabase
      .from('matchmaking_queue')
      .update({ status: 'cancelled' })
      .in('id', extraWaitingIds);
  }
}

async function cleanupWaitingGames(supabase: ServerSupabase, playerId: string) {
  const staleCutoff = minutesAgoIso(MATCHMAKING_STALE_MINUTES);

  await supabase
    .from('games')
    .delete()
    .eq('status', 'waiting')
    .is('black_player_id', null)
    .lt('created_at', staleCutoff);

  const { data: playerWaitingGames } = await supabase
    .from('games')
    .select('id')
    .eq('white_player_id', playerId)
    .eq('status', 'waiting')
    .is('black_player_id', null)
    .order('created_at', { ascending: false });

  const stalePlayerWaitingIds = (playerWaitingGames ?? [])
    .slice(MAX_PLAYER_WAITING_ROWS)
    .map((row) => String(row.id))
    .filter(Boolean);

  if (stalePlayerWaitingIds.length > 0) {
    await supabase.from('games').delete().in('id', stalePlayerWaitingIds);
  }
}

async function getUsableMatchedGameId(supabase: ServerSupabase, queueRow: QueueRow): Promise<string | null> {
  if (!queueRow.game_id) return null;
  const { data: game } = await supabase.from('games').select('id, status').eq('id', queueRow.game_id).maybeSingle();
  const status = typeof game?.status === 'string' ? game.status : null;
  if (status === 'waiting' || status === 'active') return queueRow.game_id;
  await supabase.from('matchmaking_queue').update({ status: 'expired' }).eq('id', queueRow.id);
  return null;
}

async function findMatchUsingGamesTable(supabase: ServerSupabase, playerId: string, seed: string, backRankCode: string) {
  await cleanupWaitingGames(supabase, playerId);

  const { data: existingRows, error: existingError } = await supabase
    .from('games')
    .select('id, status, white_player_id, black_player_id, seed, back_rank_code')
    .or(`white_player_id.eq.${playerId},black_player_id.eq.${playerId}`)
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
    return { status: 'waiting' as const, queueId: existing.id, seed: existing.seed ?? seed, backRankCode: existing.back_rank_code ?? backRankCode };
  }

  const { data: opponentRows, error: opponentError } = await supabase
    .from('games')
    .select('id, white_player_id, seed, back_rank_code')
    .eq('status', 'waiting')
    .is('black_player_id', null)
    .neq('white_player_id', playerId)
    .order('created_at', { ascending: true })
    .limit(1);

  if (opponentError) {
    return { status: 'unavailable' as const, message: 'Matchmaking is not available. Use Invite Friend for now.' };
  }

  const opponent = opponentRows?.[0] as MatchmakingGameRow | undefined;
  if (opponent?.white_player_id && opponent.seed && opponent.back_rank_code) {
    const openerPlaysWhite = Math.random() < 0.5;
    const { data: matchedGame, error: matchError } = await supabase
      .from('games')
      .update({
        white_player_id: openerPlaysWhite ? opponent.white_player_id : playerId,
        black_player_id: openerPlaysWhite ? playerId : opponent.white_player_id,
        status: 'active',
      })
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
  const requestedBackRankCode = getString(request.body?.backRankCode)?.toUpperCase() ?? null;
  const backRankCode = requestedBackRankCode ?? (seedValidation?.ok ? seedValidation.backRankCode : null);
  if (!playerId || !seedValidation) {
    response.status(400).send('Missing playerId, seed, or backRankCode');
    return;
  }
  if (seedValidation.ok === false || !seed || !backRankCode) {
    response.status(400).send(seedValidation.ok === false ? seedValidation.error : 'Missing playerId, seed, or backRankCode');
    return;
  }
  if (requestedBackRankCode && !isValidBackRankCode(requestedBackRankCode)) {
    response.status(400).send('Invalid backRankCode');
    return;
  }

  const supabase = getServerSupabase();
  await cleanupMatchmakingQueue(supabase, playerId);

  const { data: existingRows, error: existingError } = await supabase
    .from('matchmaking_queue')
    .select('*')
    .eq('player_id', playerId)
    .in('status', ['waiting', 'matched'])
    .order('created_at', { ascending: false })
    .limit(1);

  if (existingError) {
    response.status(200).json(await findMatchUsingGamesTable(supabase, playerId, seed, backRankCode));
    return;
  }

  const existing = existingRows?.[0] as QueueRow | undefined;
  if (existing?.status === 'matched' && existing.game_id) {
    const usableGameId = await getUsableMatchedGameId(supabase, existing);
    if (usableGameId) {
      response.status(200).json({ status: 'matched', gameId: usableGameId });
      return;
    }
  }

  const { data: opponent, error: opponentError } = await supabase
    .from('matchmaking_queue')
    .select('*')
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
    const openerPlaysWhite = Math.random() < 0.5;
    const whitePlayerId = openerPlaysWhite ? opponentRow.player_id : playerId;
    const blackPlayerId = openerPlaysWhite ? playerId : opponentRow.player_id;
    const { data: game, error: gameError } = await safeSupabaseInsert<{ id: string }>(
      supabase,
      {
        ...getGamePayload(whitePlayerId, opponentRow.seed, opponentRow.back_rank_code, blackPlayerId, 'active'),
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
      await supabase.from('matchmaking_queue').insert({ player_id: playerId, seed: opponentRow.seed, back_rank_code: opponentRow.back_rank_code, status: 'matched', game_id: game.id });
    }

    response.status(200).json({ status: 'matched', gameId: game.id });
    return;
  }

  if (existing?.status === 'waiting') {
    response.status(200).json({ status: 'waiting', queueId: existing.id, seed: existing.seed, backRankCode: existing.back_rank_code });
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
