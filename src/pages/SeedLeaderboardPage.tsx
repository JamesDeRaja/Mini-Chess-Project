import { useEffect, useMemo, useState } from 'react';
import { Copy, Home, Play, Trophy } from 'lucide-react';
import { normalizeSeedSlug, getSeedDisplayName } from '../game/curatedSeeds.js';
import { createSeedFromInput } from '../game/seed.js';
import { createSeedChallengeUrl } from '../game/challenge.js';
import { buildShareMessage, getRandomShareTaunt } from '../game/shareTaunts.js';
import { getDisplayName } from '../game/localPlayer.js';
import { fetchSeedLeaderboard, type SeedScoreRecord } from '../multiplayer/challengeApi.js';

type Props = { seedSlug: string; onPlaySeed: (seed: string, backRankCode?: string) => void; onHome: () => void };

function formatResult(result: string): string {
  if (result === 'draw') return 'Draw';
  if (result === 'white_won') return 'White won';
  if (result === 'black_won') return 'Black won';
  return result.replace(/_/g, ' ');
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function SeedLeaderboardPage({ seedSlug, onPlaySeed, onHome }: Props) {
  const normalized = normalizeSeedSlug(seedSlug);
  const valid = createSeedFromInput(normalized);
  const setup = valid.ok ? valid.backRankCode : 'BQKRN';
  const [scores, setScores] = useState<SeedScoreRecord[] | null>(null);

  useEffect(() => { fetchSeedLeaderboard(normalized).then(setScores).catch(() => setScores(null)); }, [normalized]);

  const top = useMemo(() => [...(scores ?? [])].sort((a, b) => b.score - a.score || a.moves - b.moves || String(a.created_at).localeCompare(String(b.created_at))).slice(0, 10), [scores]);
  const champion = top[0];
  const chasingPack = top.slice(1, 4);
  const shareText = buildShareMessage({ style: 'leaderboard', taunt: getRandomShareTaunt('leaderboard'), playerName: getDisplayName(), score: champion?.score ?? 0, moves: champion?.moves ?? 0, seedSlug: normalized, backRankCode: setup, challengeUrl: createSeedChallengeUrl(normalized) });

  return (
    <main className="challenge-page seed-leaderboard-page">
      <section className="challenge-card wide seed-leaderboard-card">
        <button type="button" className="seed-detail-home-button" aria-label="Go home" onClick={onHome}><Home size={22} /></button>
        <div className="seed-leaderboard-hero">
          <div>
            <p className="eyebrow">Seed Leaderboard</p>
            <h1>{getSeedDisplayName(normalized)}</h1>
            <p>{normalized} · Setup <strong>{setup}</strong></p>
          </div>
          <div className="seed-leaderboard-setup-badge" aria-label={`Back rank ${setup}`}>
            <span>BACK RANK</span>
            <strong>{setup}</strong>
          </div>
        </div>

        {scores === null ? (
          <p className="panel-note">Leaderboard unavailable. You can still play and share this seed.</p>
        ) : top.length === 0 ? (
          <p className="panel-note">Be the first to set a score on this seed.</p>
        ) : (
          <div className="seed-leaderboard-layout">
            {champion && (
              <article className="seed-champion-card">
                <span className="seed-champion-crown"><Trophy size={22} aria-hidden="true" /> #1</span>
                <h2>{champion.player_name ?? 'Anonymous Player'}</h2>
                <strong>{champion.score}</strong>
                <p>{champion.moves} moves · {formatResult(champion.result)} · {champion.color}</p>
                <small>{formatDate(champion.created_at)}</small>
              </article>
            )}
            <div className="seed-leaderboard-list-wrap">
              {chasingPack.length > 0 && (
                <div className="seed-podium-row" aria-label="Top challengers">
                  {chasingPack.map((entry, index) => (
                    <div className="seed-podium-card" key={entry.id}>
                      <span>#{index + 2}</span>
                      <strong>{entry.player_name ?? 'Anonymous Player'}</strong>
                      <b>{entry.score}</b>
                      <small>{entry.moves} moves</small>
                    </div>
                  ))}
                </div>
              )}
              <div className="leaderboard-table seed-leaderboard-table" aria-label="Seed best scores">
                <div className="leaderboard-row leaderboard-head"><span>Rank</span><span>Player</span><span>Score</span><span>Moves</span><span>Result</span><span>Color</span><span>Date</span></div>
                {top.map((entry, index) => (
                  <div className="leaderboard-row" key={entry.id}>
                    <span className="seed-rank-pill">{index + 1}</span>
                    <span className="seed-player-name">{entry.player_name ?? 'Anonymous Player'}</span>
                    <strong>{entry.score}</strong>
                    <span>{entry.moves}</span>
                    <span>{formatResult(entry.result)}</span>
                    <span>{entry.color}</span>
                    <time dateTime={entry.created_at ?? undefined}>{formatDate(entry.created_at)}</time>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="panel-actions centered-actions seed-leaderboard-actions">
          <button type="button" onClick={() => onPlaySeed(normalized, setup)}><Play size={17} /> Play this seed</button>
          <button type="button" onClick={() => { void navigator.clipboard?.writeText(shareText); }}><Copy size={17} /> Share seed</button>
          <button type="button" onClick={onHome}><Home size={17} /> Home</button>
        </div>
      </section>
    </main>
  );
}
