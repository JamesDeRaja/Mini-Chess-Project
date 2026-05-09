import type { SupabaseClient } from '@supabase/supabase-js';

type BaseUpdateFields = Partial<{
  board: unknown;
  turn: string;
  status: string;
  move_history: unknown[];
}>;

type OptionalUpdateFields = Partial<{
  seed: string;
  seed_source: string;
  back_rank_code: string;
  match_id: string;
  round_number: number;
  winner: string | null;
  result_type: string | null;
  total_moves: number;
  white_score: number;
  black_score: number;
}>;

type UpdateGamePayload = BaseUpdateFields & OptionalUpdateFields;

/**
 * Update a game row in Supabase, retrying with only base fields if optional
 * metadata columns are not yet present in the table.
 */
export async function safeGameUpdate(
  supabase: SupabaseClient,
  gameId: string,
  payload: UpdateGamePayload,
): Promise<boolean> {
  const { error } = await supabase.from('games').update(payload).eq('id', gameId);

  if (!error) return true;

  const isColumnError =
    error.message?.includes('column') ||
    error.code === '42703' ||
    error.message?.includes('schema cache');

  if (!isColumnError) return false;

  // Retry with only known-safe fields
  const baseKeys: (keyof BaseUpdateFields)[] = ['board', 'turn', 'status', 'move_history'];
  const basePayload: BaseUpdateFields = {};
  for (const key of baseKeys) {
    if (key in payload) {
      (basePayload as Record<string, unknown>)[key] = payload[key];
    }
  }

  const { error: retryError } = await supabase.from('games').update(basePayload).eq('id', gameId);
  return !retryError;
}
