import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getServerSupabase } from '../games/serverSupabase.js';
function cleanText(value: unknown, maxLength: number): string | null { if (typeof value !== 'string') return null; const text = value.trim().replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').slice(0, maxLength); return text || null; }
export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') { response.status(405).send('Method not allowed'); return; }
  const seed_slug = cleanText(request.body?.seed_slug, 80);
  const seed = cleanText(request.body?.seed, 80);
  const back_rank_code = cleanText(request.body?.back_rank_code, 5)?.toUpperCase() ?? null;
  const score = Number(request.body?.score);
  const moves = Number(request.body?.moves);
  if (!seed_slug || !seed || !back_rank_code || !Number.isFinite(score) || !Number.isFinite(moves)) { response.status(400).send('Invalid seed score'); return; }
  try {
    const supabase = getServerSupabase();
    const row = { seed_slug, seed, back_rank_code, player_id: cleanText(request.body?.player_id, 120), player_name: cleanText(request.body?.player_name, 20), score: Math.max(0, Math.round(score)), moves: Math.max(0, Math.round(moves)), result: cleanText(request.body?.result, 24) ?? 'draw', color: cleanText(request.body?.color, 8) ?? 'white', challenge_id: cleanText(request.body?.challenge_id, 80) };
    const { error } = await supabase.from('seed_scores').insert(row);
    if (error) throw error;
    await supabase.from('seed_stats').upsert({ seed_slug, seed, back_rank_code, display_name: seed_slug, total_completed: 1, total_plays: 1, best_score: row.score, best_score_player_name: row.player_name, best_score_challenge_id: row.challenge_id, last_played_at: new Date().toISOString() }, { onConflict: 'seed_slug' });
    response.status(200).json({ ok: true });
  } catch { response.status(200).json({ ok: false }); }
}
