import { useEffect, useMemo, useState } from 'react';
import { Home, Share2, Trophy, Users } from 'lucide-react';
import { CURATED_SEEDS } from '../game/curatedSeeds.js';
import { createSeedFromInput } from '../game/seed.js';
import { fetchPopularSeedStats, type SeedStatsRecord } from '../multiplayer/challengeApi.js';

type SortMode = 'popular' | 'new' | 'highest' | 'shared' | 'daily';
type Props = { onPlaySeed: (seed: string, backRankCode?: string) => void; onChallengeSeed: (seed: string, backRankCode?: string) => void | Promise<void>; onOpenSeed: (seed: string) => void; onLeaderboard: (seed: string) => void; onHome: () => void };

export function PopularSeedsPage({ onPlaySeed, onChallengeSeed, onOpenSeed, onLeaderboard, onHome }: Props) {
  const [stats, setStats] = useState<SeedStatsRecord[]>([]);
  const [sort, setSort] = useState<SortMode>('popular');
  useEffect(() => { fetchPopularSeedStats().then(setStats).catch(() => setStats([])); }, []);
  const statBySeed = useMemo(() => new Map(stats.map((row) => [row.seed_slug, row])), [stats]);
  const seeds = useMemo(() => [...CURATED_SEEDS].sort((a, b) => {
    const av = statBySeed.get(a.slug); const bv = statBySeed.get(b.slug);
    if (sort === 'highest') return (bv?.best_score ?? 0) - (av?.best_score ?? 0);
    if (sort === 'shared') return (bv?.total_shares ?? 0) - (av?.total_shares ?? 0);
    if (sort === 'daily') return Number(b.tags.includes('daily')) - Number(a.tags.includes('daily'));
    if (sort === 'new') return b.slug.localeCompare(a.slug);
    return (bv?.total_shares ?? 0) - (av?.total_shares ?? 0) || (bv?.total_completed ?? 0) - (av?.total_completed ?? 0) || (bv?.total_plays ?? 0) - (av?.total_plays ?? 0);
  }), [sort, statBySeed]);

  return (
    <main className="challenge-page popular-seeds-page">
      <button type="button" className="seed-detail-home-button" aria-label="Go home" onClick={onHome}><Home size={22} /></button>
      <section className="challenge-card wide">
        <p className="eyebrow">Popular Seeds</p>
        <h1>Play Popular Seeds</h1>
        <p>Curated shared setups first. Dynamic stats appear when the leaderboard service is available.</p>
        <div className="leaderboard-tabs">
          {(['popular', 'new', 'highest', 'shared', 'daily'] as SortMode[]).map((mode) => <button key={mode} className={sort === mode ? 'selected' : ''} type="button" onClick={() => setSort(mode)}>{mode}</button>)}
        </div>
        <div className="seed-card-grid">
          {seeds.map((seed) => {
            const valid = createSeedFromInput(seed.slug);
            const setup = valid.ok ? valid.backRankCode : 'BQKRN';
            const row = statBySeed.get(seed.slug);
            return (
              <article
                className="seed-card seed-card-clickable"
                key={seed.slug}
                role="button"
                tabIndex={0}
                onClick={() => onOpenSeed(seed.slug)}
                onKeyDown={(event) => {
                  if ((event.key === 'Enter' || event.key === ' ') && event.currentTarget === event.target) {
                    event.preventDefault();
                    onOpenSeed(seed.slug);
                  }
                }}
              >
                <h2>{seed.displayName}</h2>
                <strong>{seed.slug}</strong>
                <p>{seed.description}</p>
                <p>Setup: <b>{setup}</b></p>
                <p>Plays: {row?.total_plays ?? 0} · Shares: {row?.total_shares ?? 0}</p>
                <p>Best Score: {row?.best_score ? `${row.best_score} by ${row.best_score_player_name ?? 'Anonymous Player'}` : '—'}</p>
                <div className="seed-card-action-stack">
                  <div className="seed-card-action-row">
                    <button type="button" onClick={(event) => { event.stopPropagation(); onPlaySeed(seed.slug, setup); }}>Play AI</button>
                    <button type="button" className="seed-icon-action" aria-label={`Share ${seed.displayName}`} onClick={(event) => { event.stopPropagation(); void navigator.clipboard?.writeText(createSeedChallengeUrl(seed.slug)); }}><Share2 size={16} /></button>
                    <button type="button" className="seed-icon-action" aria-label={`${seed.displayName} leaderboard`} onClick={(event) => { event.stopPropagation(); onLeaderboard(seed.slug); }}><Trophy size={16} /></button>
                  </div>
                  <button type="button" className="secondary-action seed-challenge-action" onClick={(event) => { event.stopPropagation(); void onChallengeSeed(seed.slug, setup); }}><Users size={16} /> Challenge Friend</button>
                </div>
              </article>
            );
          })}
        </div>
        <div className="panel-actions centered-actions"><button type="button" onClick={onHome}><Home size={17} /> Home</button></div>
      </section>
    </main>
  );
}
