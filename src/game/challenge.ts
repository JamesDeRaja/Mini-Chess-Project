import type { Color, GameStatus } from './types.js';

export type ChallengePayloadInput = {
  seed: string;
  seedSlug: string;
  backRankCode: string;
  displaySeedName?: string | null;
  playerName?: string | null;
  playerId?: string | null;
  score: number;
  moves: number;
  result: GameStatus | 'win' | 'loss' | 'stalemate';
  color: Color;
  parentChallengeId?: string | null;
  chainRootId?: string | null;
  chainDepth?: number;
  shareTaunt?: string | null;
  shareText?: string | null;
};

export type ChallengePayload = {
  seed: string;
  seed_slug: string;
  back_rank_code: string;
  display_seed_name: string | null;
  challenger_name: string | null;
  challenger_player_id: string | null;
  challenger_score: number;
  challenger_moves: number;
  challenger_result: string;
  challenger_color: Color;
  game_mode: string;
  share_text: string | null;
  share_taunt: string | null;
  parent_challenge_id: string | null;
  chain_root_id: string | null;
  chain_depth: number;
};

export type ActiveChallengeContext = {
  challengeId: string;
  seed: string;
  seedSlug: string;
  backRankCode: string;
  previousPlayerName: string;
  previousScore: number;
  previousMoves: number;
  chainRootId?: string | null;
  chainDepth?: number;
};

export type ChallengeComparison = {
  outcome: 'beat' | 'failed' | 'tied' | 'fasterTie';
  beatPrevious: boolean;
  pointsDelta: number;
  message: string;
};

export function createChallengePayload(input: ChallengePayloadInput): ChallengePayload {
  return {
    seed: input.seed,
    seed_slug: input.seedSlug,
    back_rank_code: input.backRankCode,
    display_seed_name: input.displaySeedName ?? null,
    challenger_name: input.playerName ?? null,
    challenger_player_id: input.playerId ?? null,
    challenger_score: Number.isFinite(input.score) ? Math.max(0, Math.round(input.score)) : 0,
    challenger_moves: Number.isFinite(input.moves) ? Math.max(0, Math.round(input.moves)) : 0,
    challenger_result: input.result,
    challenger_color: input.color,
    game_mode: 'seed',
    share_text: input.shareText ?? null,
    share_taunt: input.shareTaunt ?? null,
    parent_challenge_id: input.parentChallengeId ?? null,
    chain_root_id: input.chainRootId ?? null,
    chain_depth: input.chainDepth ?? 0,
  };
}

export function createChallengeUrl(challengeId: string, origin = typeof window !== 'undefined' ? window.location.origin : ''): string {
  return `${origin}/challenge/${encodeURIComponent(challengeId)}`;
}

export function createSeedChallengeUrl(seedSlug: string, origin = typeof window !== 'undefined' ? window.location.origin : ''): string {
  return `${origin}/seed/${encodeURIComponent(seedSlug)}`;
}

export function compareChallengeResult(input: { previousScore: number; previousMoves: number; newScore: number; newMoves: number; previousPlayerName?: string; newPlayerName?: string; seedSlug?: string; }): ChallengeComparison {
  const previousName = input.previousPlayerName || 'Previous player';
  const newName = input.newPlayerName || 'You';
  const pointsDelta = input.newScore - input.previousScore;
  if (pointsDelta > 0) return { outcome: 'beat', beatPrevious: true, pointsDelta, message: `${newName} beat ${previousName} by ${pointsDelta} points${input.seedSlug ? ` on ${input.seedSlug}` : ''}.` };
  if (pointsDelta < 0) return { outcome: 'failed', beatPrevious: false, pointsDelta, message: `${previousName} is still ahead by ${Math.abs(pointsDelta)} points.` };
  if (input.newMoves < input.previousMoves) return { outcome: 'fasterTie', beatPrevious: true, pointsDelta: 0, message: `${newName} matched ${previousName}'s score but won faster.` };
  if (input.newMoves > input.previousMoves) return { outcome: 'failed', beatPrevious: false, pointsDelta: 0, message: `${previousName} matched the score in fewer moves.` };
  return { outcome: 'tied', beatPrevious: false, pointsDelta: 0, message: 'Draw challenge. Same score, same seed.' };
}
