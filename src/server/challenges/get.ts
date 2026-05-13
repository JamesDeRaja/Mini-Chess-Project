import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getServerSupabase } from '../supabase.js';
function cleanId(value: unknown): string | null { return typeof value === 'string' ? value.trim().replace(/[^a-zA-Z0-9-]/g, '').slice(0, 80) || null : null; }
export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') { response.status(405).send('Method not allowed'); return; }
  const id = cleanId(request.query.id);
  if (!id) { response.status(400).send('Invalid challenge id'); return; }
  try {
    const { data, error } = await getServerSupabase().from('challenges').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    response.status(200).json({ challenge: data ?? null });
  } catch (error) { response.status(503).send(error instanceof Error ? error.message : 'Challenge unavailable'); }
}
