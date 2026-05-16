import type { getServerSupabase } from '../supabase.js';

type ServerSupabase = ReturnType<typeof getServerSupabase>;

export async function cleanupPlayerWaitingGames(supabase: ServerSupabase, playerId: string) {
  await supabase
    .from('games')
    .delete()
    .eq('white_player_id', playerId)
    .eq('status', 'waiting')
    .is('black_player_id', null);
}
