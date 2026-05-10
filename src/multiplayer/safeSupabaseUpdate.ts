import { getMissingSchemaColumn, optionalGameMetadataFields, pickBaseGameFields } from './safeSupabaseInsert.js';

type SupabaseError = { message: string };
type QueryResult<T> = { data: T | null; error: SupabaseError | null };
type UpdateQuery<T> = {
  eq: (column: 'id', value: string) => {
    select: (columns?: string) => {
      single: () => PromiseLike<QueryResult<T>>;
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
  let currentPayload = { ...payload };
  let firstAttempt: QueryResult<T> | null = null;

  for (let attempt = 0; attempt <= optionalGameMetadataFields.length; attempt += 1) {
    const result = await supabase.from('games').update(currentPayload).eq('id', gameId).select(selectColumns).single();
    if (!firstAttempt) firstAttempt = result;
    if (!result.error) return result;

    const missingColumn = getMissingSchemaColumn(result.error);
    if (!missingColumn || !(missingColumn in currentPayload)) break;

    currentPayload = { ...currentPayload };
    delete currentPayload[missingColumn];
  }

  const basePayload = pickBaseGameFields(payload);
  const retryAttempt = await supabase.from('games').update(basePayload).eq('id', gameId).select(selectColumns).single();
  return retryAttempt.error ? (firstAttempt ?? retryAttempt) : retryAttempt;
}
