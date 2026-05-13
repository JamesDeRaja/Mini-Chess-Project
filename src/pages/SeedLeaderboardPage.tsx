import { useEffect, useMemo, useState } from 'react';
import { Copy, Home } from 'lucide-react';
import { normalizeSeedSlug, getSeedDisplayName } from '../game/curatedSeeds.js';
import { createSeedFromInput } from '../game/seed.js';
import { createSeedChallengeUrl } from '../game/challenge.js';
import { buildShareMessage, getRandomShareTaunt } from '../game/shareTaunts.js';
import { getDisplayName } from '../game/localPlayer.js';
import { fetchSeedLeaderboard, type SeedScoreRecord } from '../multiplayer/challengeApi.js';

type Props = { seedSlug: string; onPlaySeed: (seed: string, backRankCode?: string) => void; onHome: () => void };
export function SeedLeaderboardPage({ seedSlug, onPlaySeed, onHome }: Props) {
  const normalized = normalizeSeedSlug(seedSlug);
  const valid = createSeedFromInput(normalized);
  const setup = valid.ok ? valid.backRankCode : 'BQKRN';
  const [scores, setScores] = useState<SeedScoreRecord[] | null>(null);
  useEffect(() => { fetchSeedLeaderboard(normalized).then(setScores).catch(() => setScores(null)); }, [normalized]);
  const top = useMemo(() => [...(scores ?? [])].sort((a,b) => b.score - a.score || a.moves - b.moves || String(a.created_at).localeCompare(String(b.created_at))).slice(0, 10), [scores]);
  const shareText = buildShareMessage({ style: 'leaderboard', taunt: getRandomShareTaunt('leaderboard'), playerName: getDisplayName(), score: top[0]?.score ?? 0, moves: top[0]?.moves ?? 0, seedSlug: normalized, backRankCode: setup, challengeUrl: createSeedChallengeUrl(normalized) });
  return <main className="challenge-page"><section className="challenge-card wide"><p className="eyebrow">Seed Leaderboard</p><h1>{getSeedDisplayName(normalized)}</h1><p>{normalized} · Setup {setup}</p>{scores === null ? <p className="panel-note">Leaderboard unavailable. You can still play and share this seed.</p> : top.length === 0 ? <p>Be the first to set a score on this seed.</p> : <div className="leaderboard-table seed-leaderboard-table"><div className="leaderboard-row leaderboard-head"><span>Rank</span><span>Player</span><span>Score</span><span>Moves</span><span>Result</span><span>Color</span><span>Time</span></div>{top.map((entry, index) => <div className="leaderboard-row" key={entry.id}><span>{index + 1}</span><span>{entry.player_name ?? 'Anonymous Player'}</span><span>{entry.score}</span><span>{entry.moves}</span><span>{entry.result}</span><span>{entry.color}</span><span>{entry.created_at ? new Date(entry.created_at).toLocaleDateString() : '—'}</span></div>)}</div>}<div className="panel-actions centered-actions"><button type="button" onClick={() => onPlaySeed(normalized, setup)}>Play this seed</button><button type="button" onClick={() => { void navigator.clipboard?.writeText(shareText); }}><Copy size={17} /> Share seed</button><button type="button" onClick={onHome}><Home size={17} /> Home</button></div></section></main>;
}
