import { pickBaseGameFields } from './safeSupabaseInsert';

type QueryResult<T> = { data: T | null; error: { message: string } | null };
type UpdateQuery<T> = {
  eq: (column: 'id', value: string) => {
    select: (columns?: string) => {
      single: () => Promise<QueryResult<T>>;
    };
  };
};
type SupabaseTable<T> = {
  update: (payload: Record<string, unknown>) => UpdateQuery<T>;
};
type SupabaseClientLike<T> = {
  from: (table: 'games') => SupabaseTable<T>;
};

export async function safeSupabaseUpdate<T>(
  supabase: SupabaseClientLike<T>,
  gameId: string,
  payload: Record<string, unknown>,
  selectColumns = '*',
): Promise<QueryResult<T>> {
  const firstAttempt = await supabase.from('games').update(payload).eq('id', gameId).select(selectColumns).single();
  if (!firstAttempt.error) return firstAttempt;

  const basePayload = pickBaseGameFields(payload);
  const retryAttempt = await supabase.from('games').update(basePayload).eq('id', gameId).select(selectColumns).single();
  return retryAttempt.error ? firstAttempt : retryAttempt;
}
