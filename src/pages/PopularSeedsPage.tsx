import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Home, Search, Share2, Trophy, Users } from 'lucide-react';
import { CURATED_SEEDS } from '../game/curatedSeeds.js';
import { createSeedFromInput, dailyBackRankCodeFromSeed, getDailySeed } from '../game/seed.js';
import { buildSeedShareMessage, getRandomShareTaunt } from '../game/shareTaunts.js';
import { fetchPopularSeedStats, type SeedStatsRecord } from '../multiplayer/challengeApi.js';

type SortMode = 'popular' | 'new' | 'highest' | 'shared' | 'daily';
type Props = { onPlaySeed: (seed: string, backRankCode?: string) => void; onChallengeSeed: (seed: string, backRankCode?: string) => void | Promise<void>; onOpenSeed: (seed: string) => void; onLeaderboard: (seed: string) => void; onHome: () => void };

function createPopularSeedUrl(seedSlug: string) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/seed/${encodeURIComponent(seedSlug)}`;
}


function spacedSetup(backRankCode: string): string {
  return backRankCode.split('').join(' ');
}

function hasBestScore(row?: SeedStatsRecord): row is SeedStatsRecord & { best_score: number } {
  return typeof row?.best_score === 'number' && row.best_score > 0;
}

function copySeedChallengeLink(seedSlug: string) {
  const validation = createSeedFromInput(seedSlug);
  const shareText = buildSeedShareMessage({
    style: 'popularSeed',
    taunt: getRandomShareTaunt('friendChallenge'),
    seedSlug,
    backRankCode: validation.ok ? validation.backRankCode : 'BQKRN',
    challengeUrl: createPopularSeedUrl(seedSlug),
  });
  void navigator.clipboard?.writeText(shareText);
}

export function PopularSeedsPage({ onPlaySeed, onChallengeSeed, onOpenSeed, onLeaderboard, onHome }: Props) {
  const [stats, setStats] = useState<SeedStatsRecord[]>([]);
  const [sort, setSort] = useState<SortMode>('popular');
  const [searchQuery, setSearchQuery] = useState('');
  useEffect(() => { fetchPopularSeedStats().then(setStats).catch(() => setStats([])); }, []);
  const statBySeed = useMemo(() => new Map(stats.map((row) => [row.seed_slug, row])), [stats]);
  const seeds = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return [...CURATED_SEEDS]
      .filter((seed) => {
        if (!query) return true;
        const searchableText = [
          seed.slug,
          seed.displayName,
          seed.description,
          ...seed.tags,
          ...(seed.aliases ?? []),
        ].join(' ').toLowerCase();
        return searchableText.includes(query);
      })
      .sort((a, b) => {
        const av = statBySeed.get(a.slug); const bv = statBySeed.get(b.slug);
        if (sort === 'highest') return (bv?.best_score ?? 0) - (av?.best_score ?? 0);
        if (sort === 'shared') return (bv?.total_shares ?? 0) - (av?.total_shares ?? 0);
        if (sort === 'daily') return Number(b.tags.includes('daily')) - Number(a.tags.includes('daily'));
        if (sort === 'new') return b.slug.localeCompare(a.slug);
        return (bv?.total_shares ?? 0) - (av?.total_shares ?? 0) || (bv?.total_completed ?? 0) - (av?.total_completed ?? 0) || (bv?.total_plays ?? 0) - (av?.total_plays ?? 0);
      });
  }, [searchQuery, sort, statBySeed]);

  const dailySeed = getDailySeed();
  const dailySetup = dailyBackRankCodeFromSeed(dailySeed);
  const featuredSeed = seeds[0];
  const regularSeeds = seeds.slice(1);

  function renderSeedCard(seed: (typeof CURATED_SEEDS)[number], featured = false) {
    const valid = createSeedFromInput(seed.slug);
    const setup = valid.ok ? valid.backRankCode : 'BQKRN';
    const row = statBySeed.get(seed.slug);
    const bestScoreVisible = hasBestScore(row);

    return (
      <article
        className={`seed-card seed-card-clickable${featured ? ' seed-card-featured' : ''}`}
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
        <div className="seed-card-main">
          <div className="seed-card-heading-row">
            <div>
              {featured && <span className="seed-featured-pill">Featured</span>}
              <h2>{seed.displayName}</h2>
              <strong>{seed.slug}</strong>
            </div>
          </div>
          <p className="seed-card-description">{seed.description}</p>
          <div className="seed-tag-row">{seed.tags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}</div>
        </div>

        <div className="seed-setup-strip" aria-label={`Setup ${spacedSetup(setup)}`}>
          <small>Setup</small>
          <b>{spacedSetup(setup)}</b>
        </div>

        <div className="seed-stat-row">
          <span><small>Plays</small><b>{row?.total_plays ?? 0}</b></span>
          <span><small>Shares</small><b>{row?.total_shares ?? 0}</b></span>
          {bestScoreVisible && <span className="seed-best-score"><small>Best Score</small><b>{row.best_score} by {row.best_score_player_name ?? 'Anonymous Player'}</b></span>}
        </div>

        <div className="seed-card-action-stack">
          <button type="button" className="seed-primary-action" onClick={(event) => { event.stopPropagation(); onPlaySeed(seed.slug, setup); }}>Play Seed</button>
          <div className="seed-secondary-action-row">
            <button type="button" className="secondary-action seed-challenge-action" onClick={(event) => { event.stopPropagation(); void onChallengeSeed(seed.slug, setup); }}><Users size={16} /> Challenge Friend</button>
            <button type="button" className="seed-icon-action" aria-label={`Share ${seed.displayName}`} onClick={(event) => { event.stopPropagation(); copySeedChallengeLink(seed.slug); }}><Share2 size={16} /></button>
            <button type="button" className="seed-icon-action" aria-label={`${seed.displayName} leaderboard`} onClick={(event) => { event.stopPropagation(); onLeaderboard(seed.slug); }}><Trophy size={16} /></button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <main className="challenge-page popular-seeds-page">
      <button type="button" className="seed-detail-home-button" aria-label="Go home" onClick={onHome}><Home size={22} /></button>
      <section className="challenge-card wide popular-seeds-shell">
        <header className="popular-seeds-header">
          <p className="eyebrow">Popular Seeds</p>
          <h1>Play Popular Seeds</h1>
          <p>Curated shared setups first. Dynamic stats appear when the leaderboard service is available.</p>
          <label className="popular-seed-search">
            <Search size={20} aria-hidden="true" />
            <span className="sr-only">Search popular seeds</span>
            <input
              type="search"
              value={searchQuery}
              placeholder="Search creators, movies, anime, tags, or seed names…"
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            <small>{seeds.length} seeds</small>
          </label>
          <div className="leaderboard-tabs">
            {(['popular', 'new', 'highest', 'shared', 'daily'] as SortMode[]).map((mode) => <button key={mode} className={sort === mode ? 'selected' : ''} type="button" onClick={() => setSort(mode)}>{mode}</button>)}
          </div>
        </header>

        <div className="popular-seed-browser">
          <aside className="popular-seed-side-panel" aria-label="Today’s Daily quick start">
            <div className="daily-seed-panel">
              <div className="daily-seed-panel-heading">
                <span className="daily-seed-icon" aria-hidden="true"><CalendarDays size={19} /></span>
                <div>
                  <h2>Today’s Daily</h2>
                  <p>A fresh setup every day.</p>
                </div>
              </div>
              <div className="seed-setup-strip daily-setup-strip" aria-label={`Daily setup ${spacedSetup(dailySetup)}`}>
                <small>Setup</small>
                <b>{spacedSetup(dailySetup)}</b>
              </div>
              <div className="daily-seed-meta">
                <span><small>Seed</small><b>{dailySeed}</b></span>
                <span><small>Mode</small><b>Daily</b></span>
              </div>
              <div className="seed-card-action-stack daily-actions">
                <button type="button" className="seed-primary-action" onClick={() => onPlaySeed(dailySeed, dailySetup)}>Play Daily</button>
                <button type="button" className="secondary-action seed-challenge-action" onClick={() => { void onChallengeSeed(dailySeed, dailySetup); }}><Users size={16} /> Challenge Friend</button>
              </div>
            </div>
          </aside>

          <div className="popular-seed-main-area">
            <div className="seed-card-grid">
              {featuredSeed && renderSeedCard(featuredSeed, true)}
              {regularSeeds.map((seed) => renderSeedCard(seed))}
              {seeds.length === 0 && <p className="seed-search-empty">No popular seeds found. Try searching for chess, anime, movie, tech, streamer, or a creator name.</p>}
            </div>
          </div>
        </div>
        <div className="panel-actions centered-actions"><button type="button" onClick={onHome}><Home size={17} /> Home</button></div>
      </section>
    </main>
  );
}
