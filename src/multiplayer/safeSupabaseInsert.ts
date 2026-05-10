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
  'created_at',
  'updated_at',
  'expires_at',
  'last_activity_at',
  'timeout_at',
  'draw_offer_by',
] as const;

type SupabaseError = { message: string };
type QueryResult<T> = { data: T | null; error: SupabaseError | null };
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

export function getMissingSchemaColumn(error: SupabaseError | null): string | null {
  const message = error?.message ?? '';
  const schemaCacheMatch = message.match(/Could not find the '([^']+)' column/);
  if (schemaCacheMatch?.[1]) return schemaCacheMatch[1];

  const columnMatch = message.match(/column "([^"]+)"/i);
  return columnMatch?.[1] ?? null;
}

export async function safeSupabaseInsert<T>(
  supabase: SupabaseClientLike<T>,
  payload: Record<string, unknown>,
  selectColumns = '*',
): Promise<QueryResult<T>> {
  let currentPayload = { ...payload };
  let firstAttempt: QueryResult<T> | null = null;

  for (let attempt = 0; attempt <= optionalGameMetadataFields.length; attempt += 1) {
    const result = await supabase.from('games').insert(currentPayload).select(selectColumns).single();
    if (!firstAttempt) firstAttempt = result;
    if (!result.error) return result;

    const missingColumn = getMissingSchemaColumn(result.error);
    if (!missingColumn || !(missingColumn in currentPayload)) break;

    currentPayload = { ...currentPayload };
    delete currentPayload[missingColumn];
  }

  const basePayload = pickBaseGameFields(payload);
  const retryAttempt = await supabase.from('games').insert(basePayload).select(selectColumns).single();
  return retryAttempt.error ? (firstAttempt ?? retryAttempt) : retryAttempt;
}
