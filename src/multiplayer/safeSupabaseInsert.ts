import type { SupabaseClient } from '@supabase/supabase-js';

type BaseGameFields = {
  board: unknown;
  turn: string;
  status: string;
  white_player_id: string | null;
  black_player_id: string | null;
  move_history: unknown[];
};

type OptionalGameFields = Partial<{
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

type InsertGamePayload = BaseGameFields & OptionalGameFields;

/**
 * Insert a game row into Supabase, retrying with only base fields if optional
 * metadata columns are not yet present in the table.
 */
export async function safeGameInsert(
  supabase: SupabaseClient,
  payload: InsertGamePayload,
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from('games')
    .insert(payload)
    .select('id')
    .single();

  if (!error) return data as { id: string };

  // If the error is about unknown columns, retry with only base fields
  const isColumnError =
    error.message?.includes('column') ||
    error.code === '42703' ||
    error.message?.includes('schema cache');

  if (!isColumnError) return null;

  const basePayload: BaseGameFields = {
    board: payload.board,
    turn: payload.turn,
    status: payload.status,
    white_player_id: payload.white_player_id,
    black_player_id: payload.black_player_id,
    move_history: payload.move_history,
  };

  const { data: retryData, error: retryError } = await supabase
    .from('games')
    .insert(basePayload)
    .select('id')
    .single();

  if (retryError) return null;
  return retryData as { id: string };
}
