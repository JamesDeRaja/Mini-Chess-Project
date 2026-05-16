import type { VercelRequest, VercelResponse } from '@vercel/node';
import { normalizeSeedSlug } from '../../game/curatedSeeds.js';
import { createSeedFromInput, isValidBackRankCode } from '../../game/seed.js';
import { getServerSupabase } from '../supabase.js';

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim().replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').slice(0, maxLength);
  return text || null;
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.status(405).send('Method not allowed');
    return;
  }

  const rawSeedSlug = cleanText(request.body?.seed_slug ?? request.body?.seed, 80);
  const seed_slug = rawSeedSlug ? normalizeSeedSlug(rawSeedSlug) : null;
  if (!seed_slug) {
    response.status(400).send('Missing seed');
    return;
  }

  const seed = cleanText(request.body?.seed, 80) ?? seed_slug;
  const requestBackRankCode = cleanText(request.body?.back_rank_code, 5)?.toUpperCase() ?? null;
  const validation = createSeedFromInput(seed_slug);
  const back_rank_code = requestBackRankCode && isValidBackRankCode(requestBackRankCode)
    ? requestBackRankCode
    : validation.ok
      ? validation.backRankCode
      : 'BQKRN';
  const supabase = getServerSupabase();

  try {
    const { data: existing } = await supabase
      .from('seed_stats')
      .select('*')
      .eq('seed_slug', seed_slug)
      .maybeSingle();
    const currentShares = typeof existing?.total_shares === 'number' ? existing.total_shares : 0;
    const { data, error } = await supabase.from('seed_stats').upsert({
      seed_slug,
      seed: existing?.seed ?? seed,
      back_rank_code: existing?.back_rank_code ?? back_rank_code,
      display_name: existing?.display_name ?? seed_slug,
      total_plays: existing?.total_plays ?? 0,
      total_completed: existing?.total_completed ?? 0,
      total_shares: currentShares + 1,
      best_score: existing?.best_score ?? 0,
      best_score_player_name: existing?.best_score_player_name ?? null,
      best_score_challenge_id: existing?.best_score_challenge_id ?? null,
      last_played_at: existing?.last_played_at ?? null,
    }, { onConflict: 'seed_slug' }).select('*').single();
    if (error) throw error;
    response.status(200).json({ ok: true, stats: data });
  } catch (error) {
    console.error('Unable to record seed share.', error);
    response.status(500).send(error instanceof Error ? error.message : 'Unable to record seed share');
  }
}
