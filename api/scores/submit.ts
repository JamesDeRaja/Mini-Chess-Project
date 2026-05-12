import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getServerSupabase } from '../games/serverSupabase.js';
import { calculateGameScore, isPlausibleScore } from '../../src/game/scoring.js';
import type { Color, GameStatus, MoveDelta, MoveRecord } from '../../src/game/types.js';

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
  return text || null;
}

function isColor(value: unknown): value is Color {
  return value === 'white' || value === 'black';
}

function isGameStatus(value: unknown): value is GameStatus {
  return value === 'white_won' || value === 'black_won' || value === 'draw' || value === 'expired' || value === 'timeout';
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.status(405).send('Method not allowed');
    return;
  }

  const playerId = cleanText(request.body?.playerId, 80);
  const displayName = cleanText(request.body?.displayName, 32);
  let seed = cleanText(request.body?.seed, 80);
  let backRankCode = cleanText(request.body?.backRankCode, 8);
  let mode = cleanText(request.body?.mode, 32);
  let side = isColor(request.body?.side) ? request.body.side : null;
  let result = cleanText(request.body?.result, 24);
  let score = Number(request.body?.score);
  let moves = Number(request.body?.moves);
  const gameId = cleanText(request.body?.gameId, 80);

  if (!playerId || !displayName || !seed || !mode || !side || !result || !isPlausibleScore(score, moves)) {
    response.status(400).send('Invalid score payload');
    return;
  }

  const supabase = getServerSupabase();

  if (gameId) {
    const { data: game, error: gameError } = await supabase.from('games').select('*').eq('id', gameId).single();
    if (gameError || !game) {
      response.status(400).send(gameError?.message ?? 'Game not found for score validation');
      return;
    }
    const serverSide: Color | null = game.white_player_id === playerId ? 'white' : game.black_player_id === playerId ? 'black' : null;
    const serverStatus = isGameStatus(game.status) ? game.status : null;
    if (!serverSide || !serverStatus || serverStatus === 'expired' || serverStatus === 'timeout') {
      response.status(400).send('Game is not eligible for score submission');
      return;
    }
    const serverHistory = Array.isArray(game.move_history) ? game.move_history as Array<MoveDelta | MoveRecord> : [];
    const serverBreakdown = calculateGameScore({ status: serverStatus, side: serverSide, moveHistory: serverHistory });
    seed = typeof game.seed === 'string' ? game.seed : seed;
    backRankCode = typeof game.back_rank_code === 'string' ? game.back_rank_code : backRankCode;
    mode = seed && seed.startsWith('daily-') ? 'daily' : mode;
    side = serverSide;
    result = serverStatus;
    score = serverBreakdown.totalScore;
    moves = serverBreakdown.fullMoves;
  }

  const { data, error } = await supabase
    .from('scores')
    .insert({ player_id: playerId, display_name: displayName, seed, back_rank_code: backRankCode, mode, side, result, score, moves })
    .select('*')
    .single();

  if (error) {
    response.status(500).send(error.message);
    return;
  }

  response.status(200).json({ ok: true, score: data });
}
