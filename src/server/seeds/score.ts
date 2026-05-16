import type { VercelRequest, VercelResponse } from '@vercel/node';
import { normalizeSeedSlug } from '../../game/curatedSeeds.js';
import { isValidBackRankCode } from '../../game/seed.js';
import { getServerSupabase } from '../supabase.js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim().replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').slice(0, maxLength);
  return text || null;
}

function cleanUuid(value: unknown): string | null {
  const text = cleanText(value, 80);
  return text && uuidPattern.test(text) ? text : null;
}

function safeScore(value: number): number {
  return Math.max(0, Math.round(value));
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.status(405).send('Method not allowed');
    return;
  }

  const rawSeedSlug = cleanText(request.body?.seed_slug, 80);
  const seed_slug = rawSeedSlug ? normalizeSeedSlug(rawSeedSlug) : null;
  const seed = cleanText(request.body?.seed, 80);
  const back_rank_code = cleanText(request.body?.back_rank_code, 5)?.toUpperCase() ?? null;
  const score = Number(request.body?.score);
  const moves = Number(request.body?.moves);
  if (!seed_slug || !seed || !back_rank_code || !isValidBackRankCode(back_rank_code) || !Number.isFinite(score) || !Number.isFinite(moves)) {
    response.status(400).send('Invalid seed score');
    return;
  }

  try {
    const supabase = getServerSupabase();
    const row = {
      seed_slug,
      seed,
      back_rank_code,
      player_id: cleanText(request.body?.player_id, 120),
      player_name: cleanText(request.body?.player_name, 20),
      score: safeScore(score),
      moves: safeScore(moves),
      result: cleanText(request.body?.result, 24) ?? 'draw',
      color: cleanText(request.body?.color, 8) ?? 'white',
      challenge_id: cleanUuid(request.body?.challenge_id),
    };

    const { error: insertError } = await supabase.from('seed_scores').insert(row);
    if (insertError) throw insertError;

    const { data: topScores } = await supabase
      .from('seed_scores')
      .select('score, player_name, challenge_id, created_at')
      .eq('seed_slug', seed_slug)
      .order('score', { ascending: false })
      .order('moves', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(1);
    const bestScore = topScores?.[0] ?? row;

    const { error: statsError } = await supabase.from('seed_stats').upsert({
      seed_slug,
      seed,
      back_rank_code,
      display_name: seed_slug,
      total_completed: 1,
      total_plays: 1,
      best_score: bestScore.score,
      best_score_player_name: bestScore.player_name,
      best_score_challenge_id: bestScore.challenge_id,
      last_played_at: new Date().toISOString(),
    }, { onConflict: 'seed_slug' });
    if (statsError) throw statsError;

    response.status(200).json({ ok: true });
  } catch (error) {
    console.error('Unable to submit seed score.', error);
    response.status(500).send(error instanceof Error ? error.message : 'Unable to submit seed score');
  }
}
