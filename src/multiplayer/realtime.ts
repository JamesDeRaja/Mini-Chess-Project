import type { RealtimeChannel } from '@supabase/supabase-js';
import type { OnlineGameRecord } from './gameApi';
import { supabase } from './supabaseClient';

export function subscribeToGame(gameId: string, onUpdate: (game: OnlineGameRecord) => void): RealtimeChannel | null {
  if (!supabase) return null;

  return supabase
    .channel(`game:${gameId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
      (payload) => onUpdate(payload.new as OnlineGameRecord),
    )
    .subscribe();
}

export function unsubscribeFromGame(channel: RealtimeChannel | null): void {
  if (channel && supabase) {
    supabase.removeChannel(channel);
  }
}
