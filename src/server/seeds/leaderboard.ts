import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getServerSupabase } from '../supabase.js';
function cleanSeed(value: unknown) { return typeof value === 'string' ? value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80) : ''; }
export default async function handler(request: VercelRequest, response: VercelResponse) {
  const seed = cleanSeed(request.query.seed);
  if (!seed) { response.status(400).send('Invalid seed'); return; }
  try {
    const { data, error } = await getServerSupabase().from('seed_scores').select('*').eq('seed_slug', seed).order('score', { ascending: false }).order('moves', { ascending: true }).order('created_at', { ascending: true }).limit(50);
    if (error) throw error;
    response.status(200).json({ scores: data ?? [] });
  } catch { response.status(200).json({ scores: [] }); }
}
