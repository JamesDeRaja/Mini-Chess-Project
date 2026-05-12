import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getServerSupabase } from '../games/serverSupabase.js';

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim().replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').slice(0, maxLength);
  return text || null;
}
function isResult(value: unknown): value is string { return typeof value === 'string' && ['white_won', 'black_won', 'draw', 'win', 'loss', 'stalemate'].includes(value); }
function isColor(value: unknown): value is 'white' | 'black' { return value === 'white' || value === 'black'; }
function isBackRankCode(value: string | null): value is string { return Boolean(value && /^[KQRBNP]{5}$/i.test(value)); }

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') { response.status(405).send('Method not allowed'); return; }
  const seed = cleanText(request.body?.seed, 80);
  const seed_slug = cleanText(request.body?.seed_slug, 80);
  const back_rank_code = cleanText(request.body?.back_rank_code, 5)?.toUpperCase() ?? null;
  const challenger_score = Number(request.body?.challenger_score);
  const challenger_moves = Number(request.body?.challenger_moves);
  const challenger_result = request.body?.challenger_result;
  const challenger_color = request.body?.challenger_color;
  if (!seed || !seed_slug || !isBackRankCode(back_rank_code) || !Number.isFinite(challenger_score) || !Number.isFinite(challenger_moves) || !isResult(challenger_result) || !isColor(challenger_color)) {
    response.status(400).send('Invalid challenge payload'); return;
  }
  try {
    const supabase = getServerSupabase();
    const parent = cleanText(request.body?.parent_challenge_id, 80);
    const chainRoot = cleanText(request.body?.chain_root_id, 80) ?? parent;
    const chainDepth = Number.isFinite(Number(request.body?.chain_depth)) ? Math.max(0, Math.round(Number(request.body.chain_depth))) : parent ? 1 : 0;
    const payload = {
      seed, seed_slug, back_rank_code,
      display_seed_name: cleanText(request.body?.display_seed_name, 80),
      challenger_name: cleanText(request.body?.challenger_name, 20),
      challenger_player_id: cleanText(request.body?.challenger_player_id, 120),
      challenger_score: Math.max(0, Math.round(challenger_score)),
      challenger_moves: Math.max(0, Math.round(challenger_moves)),
      challenger_result,
      challenger_color,
      game_mode: 'seed',
      share_text: cleanText(request.body?.share_text, 2000),
      share_taunt: cleanText(request.body?.share_taunt, 200),
      parent_challenge_id: parent,
      chain_root_id: chainRoot,
      chain_depth: chainDepth,
    };
    // Global anti-cheat is out of scope for V1. Seed scores are casual/social until server-verified replay validation is added.
    const { data, error } = await supabase.from('challenges').insert(payload).select('*').single();
    if (error) throw error;
    response.status(200).json({ challenge: data });
  } catch (error) {
    response.status(503).send(error instanceof Error ? error.message : 'Challenge service unavailable');
  }
}
