import { safeSupabaseUpdate } from '../../multiplayer/safeSupabaseUpdate.js';

const INVITE_EXPIRATION_MINUTES = 60;
const GAME_TIMEOUT_MINUTES = 60;
const CLEANUP_DAYS = 7;

const TERMINAL_CLEANUP_STATUSES = ['expired', 'timeout', 'white_won', 'black_won', 'draw', 'checkmate', 'stalemate', 'finished'] as const;

type UpdateResult = { data: GameRecord | null; error: { message: string } | null };
type UpdateBuilder = { eq: (column: 'id', value: string) => { select: (columns?: string) => { single: () => PromiseLike<UpdateResult> } } };
type DeleteBuilder = { lt: (column: 'created_at', value: string) => { in: (column: 'status', values: readonly string[]) => PromiseLike<unknown> } };
type SupabaseLike = {
  from: (table: 'games') => {
    update: (payload: Record<string, unknown>) => UpdateBuilder;
    delete: () => DeleteBuilder;
  };
};

type GameRecord = Record<string, unknown>;

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function getNewGameLifecycleFields(now = new Date()): Record<string, string> {
  const nowIso = now.toISOString();
  const timeoutIso = addMinutes(now, GAME_TIMEOUT_MINUTES).toISOString();
  return {
    created_at: nowIso,
    updated_at: nowIso,
    last_activity_at: nowIso,
    expires_at: addMinutes(now, INVITE_EXPIRATION_MINUTES).toISOString(),
    timeout_at: timeoutIso,
  };
}

function isAfterNow(value: unknown, now: Date): boolean {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && now.getTime() > date.getTime();
}

function addMinutesToIso(value: unknown, minutes: number): string | null {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return addMinutes(date, minutes).toISOString();
}

function getStringField(game: GameRecord, field: string): string | null {
  const value = game[field];
  return typeof value === 'string' ? value : null;
}

function waitingExpiresAt(game: GameRecord): string | null {
  return getStringField(game, 'expires_at') ?? addMinutesToIso(game.created_at, INVITE_EXPIRATION_MINUTES);
}

function activeTimeoutAt(game: GameRecord): string | null {
  return getStringField(game, 'timeout_at')
    ?? addMinutesToIso(getStringField(game, 'last_activity_at') ?? getStringField(game, 'updated_at') ?? getStringField(game, 'created_at'), GAME_TIMEOUT_MINUTES);
}

async function markGameTerminal(supabase: SupabaseLike, game: GameRecord, status: 'expired' | 'timeout', now = new Date()): Promise<GameRecord> {
  const payload = {
    status,
    result_type: status,
    winner: null,
    updated_at: now.toISOString(),
  };

  const { data, error } = await safeSupabaseUpdate(supabase, String(game.id), payload);
  if (error || !data) return { ...game, ...payload };
  return data;
}

export async function assessGameLifecycle(supabase: SupabaseLike, game: GameRecord, now = new Date()): Promise<GameRecord> {
  if (game.status === 'waiting' && !game.black_player_id && isAfterNow(waitingExpiresAt(game), now)) {
    return markGameTerminal(supabase, game, 'expired', now);
  }

  if (game.status === 'active' && isAfterNow(activeTimeoutAt(game), now)) {
    return markGameTerminal(supabase, game, 'timeout', now);
  }

  return game;
}

export function getActivityResetFields(now = new Date()): Record<string, string> {
  return {
    updated_at: now.toISOString(),
    last_activity_at: now.toISOString(),
    timeout_at: addMinutes(now, GAME_TIMEOUT_MINUTES).toISOString(),
  };
}

export async function cleanupOldGames(supabase: SupabaseLike): Promise<void> {
  const cutoff = new Date(Date.now() - CLEANUP_DAYS * 24 * 60 * 60 * 1000).toISOString();

  try {
    await supabase.from('games').delete().lt('created_at', cutoff).in('status', TERMINAL_CLEANUP_STATUSES);
  } catch {
    // Cleanup should never block challenge creation.
  }
}
