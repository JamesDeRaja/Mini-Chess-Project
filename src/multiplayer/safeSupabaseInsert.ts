export const baseGameFields = [
  'board',
  'turn',
  'status',
  'white_player_id',
  'black_player_id',
  'move_history',
] as const;

export const optionalGameMetadataFields = [
  'seed',
  'seed_source',
  'back_rank_code',
  'match_id',
  'round_number',
  'winner',
  'result_type',
  'total_moves',
  'white_score',
  'black_score',
] as const;

type QueryResult<T> = { data: T | null; error: { message: string } | null };
type InsertQuery<T> = {
  select: (columns?: string) => {
    single: () => PromiseLike<QueryResult<T>>;
  };
};
type SupabaseTable<T> = {
  insert: (payload: Record<string, unknown>) => InsertQuery<T>;
};
type SupabaseClientLike<T> = {
  from: (table: 'games') => SupabaseTable<T>;
};

export function pickBaseGameFields(payload: Record<string, unknown>): Record<string, unknown> {
  return baseGameFields.reduce<Record<string, unknown>>((basePayload, field) => {
    if (field in payload) basePayload[field] = payload[field];
    return basePayload;
  }, {});
}

export async function safeSupabaseInsert<T>(
  supabase: SupabaseClientLike<T>,
  payload: Record<string, unknown>,
  selectColumns = '*',
): Promise<QueryResult<T>> {
  const firstAttempt = await supabase.from('games').insert(payload).select(selectColumns).single();
  if (!firstAttempt.error) return firstAttempt;

  const basePayload = pickBaseGameFields(payload);
  const retryAttempt = await supabase.from('games').insert(basePayload).select(selectColumns).single();
  return retryAttempt.error ? firstAttempt : retryAttempt;
}
