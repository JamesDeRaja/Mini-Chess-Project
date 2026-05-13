import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getServerSupabase } from '../supabase.js';
export default async function handler(_request: VercelRequest, response: VercelResponse) {
  try {
    const { data, error } = await getServerSupabase().from('seed_stats').select('*').order('total_shares', { ascending: false }).order('total_completed', { ascending: false }).limit(50);
    if (error) throw error;
    response.status(200).json({ seeds: data ?? [] });
  } catch { response.status(200).json({ seeds: [] }); }
}
