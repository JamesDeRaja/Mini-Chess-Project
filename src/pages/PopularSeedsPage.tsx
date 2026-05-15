import { useEffect, useMemo, useState } from 'react';
import { Calendar, Home, Search, Share2, Trophy, Users } from 'lucide-react';
import { CURATED_SEEDS } from '../game/curatedSeeds.js';
import { createSeedFromInput, dailyBackRankCodeFromSeed, getDailySeed, getUtcDateKey } from '../game/seed.js';
import { buildSeedShareMessage, getRandomShareTaunt } from '../game/shareTaunts.js';
import { fetchPopularSeedStats, type SeedStatsRecord } from '../multiplayer/challengeApi.js';

type SortMode = 'popular' | 'new' | 'highest' | 'shared' | 'daily';
type Props = {
  onPlaySeed: (seed: string, backRankCode?: string) => void;
  onChallengeSeed: (seed: string, backRankCode?: string) => void | Promise<void>;
  onOpenSeed: (seed: string) => void;
  onLeaderboard: (seed: string) => void;
  onHome: () => void;
};

const PIECE_NAMES: Record<string, string> = {
  Q: 'queen', K: 'king', R: 'rook', B: 'bishop', N: 'knight', P: 'pawn',
};

const TAB_LABELS: Record<SortMode, string> = {
  popular: '★ Popular',
  new: '✦ New',
  highest: '🏆 Highest',
  shared: '👥 Shared',
  daily: '📅 Daily',
};

function createPopularSeedUrl(seedSlug: string) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/seed/${encodeURIComponent(seedSlug)}`;
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

function SetupStrip({ code }: { code: string }) {
  return (
    <div className="psp-setup-strip" aria-label={`Setup: ${code}`}>
      {code.split('').map((letter, i) => {
        const name = PIECE_NAMES[letter];
        return name
          ? <img key={i} src={`/pieces/white-${name}.png`} alt={letter} width={20} height={20} className="psp-piece-icon" />
          : <span key={i} className="psp-piece-letter">{letter}</span>;
      })}
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
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
          seed.slug, seed.displayName, seed.description,
          ...seed.tags, ...(seed.aliases ?? []),
        ].join(' ').toLowerCase();
        return searchableText.includes(query);
      })
      .sort((a, b) => {
        const av = statBySeed.get(a.slug);
        const bv = statBySeed.get(b.slug);
        if (sort === 'highest') return (bv?.best_score ?? 0) - (av?.best_score ?? 0);
        if (sort === 'shared') return (bv?.total_shares ?? 0) - (av?.total_shares ?? 0);
        if (sort === 'daily') return Number(b.tags.includes('daily')) - Number(a.tags.includes('daily'));
        if (sort === 'new') return b.slug.localeCompare(a.slug);
        return (bv?.total_shares ?? 0) - (av?.total_shares ?? 0)
          || (bv?.total_completed ?? 0) - (av?.total_completed ?? 0)
          || (bv?.total_plays ?? 0) - (av?.total_plays ?? 0);
      });
  }, [searchQuery, sort, statBySeed]);

  const dailySlug = getDailySeed(getUtcDateKey());
  const dailySetup = dailyBackRankCodeFromSeed(dailySlug);
  const dailyStat = statBySeed.get(dailySlug);

  const [featured, ...rest] = seeds;

  const featValid = featured != null ? createSeedFromInput(featured.slug) : null;
  const featSetup = featValid?.ok ? featValid.backRankCode : 'BQKRN';
  const featRow = featured != null ? statBySeed.get(featured.slug) : undefined;

  return (
    <main className="challenge-page popular-seeds-page">
      <button type="button" className="seed-detail-home-button" aria-label="Go home" onClick={onHome}>
        <Home size={22} />
      </button>

      <section className="challenge-card wide psp-card">
        {/* Compact header */}
        <header className="psp-header">
          <p className="eyebrow">Popular Seeds</p>
          <h1>Play Popular Seeds</h1>
          <p className="psp-subtitle">
            Curated shared setups first. Dynamic stats appear when the leaderboard service is available.
          </p>
          <label className="popular-seed-search psp-search">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Search popular seeds</span>
            <input
              type="search"
              value={searchQuery}
              placeholder="Search creators, movies, anime, tags, or seed names…"
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            <small>{seeds.length} seeds</small>
          </label>
          <div className="leaderboard-tabs psp-tabs">
            {(['popular', 'new', 'highest', 'shared', 'daily'] as SortMode[]).map((mode) => (
              <button key={mode} className={sort === mode ? 'selected' : ''} type="button" onClick={() => setSort(mode)}>
                {TAB_LABELS[mode]}
              </button>
            ))}
          </div>
        </header>

        {/* Bento layout: 9-col main + 3-col sidebar */}
        <div className="psp-bento">
          <div className="psp-main">
            {/* Featured card — first seed in filtered list */}
            {featured != null && (
              <article
                className="psp-featured-card seed-card-clickable"
                role="button"
                tabIndex={0}
                onClick={() => onOpenSeed(featured.slug)}
                onKeyDown={(event) => {
                  if ((event.key === 'Enter' || event.key === ' ') && event.currentTarget === event.target) {
                    event.preventDefault();
                    onOpenSeed(featured.slug);
                  }
                }}
              >
                <div className="psp-featured-body">
                  <span className="psp-featured-badge">★ FEATURED</span>
                  <h2 className="psp-featured-title">{featured.displayName}</h2>
                  <p className="psp-featured-slug">{featured.slug}</p>
                  <p className="psp-featured-desc">{featured.description}</p>
                  <div className="seed-tag-row psp-featured-tags">
                    {featured.tags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}
                  </div>
                  <div className="psp-featured-stats">
                    <span>Setup <strong>{featSetup}</strong></span>
                    <span>{formatCount(featRow?.total_plays ?? 0)} plays</span>
                    <span>{formatCount(featRow?.total_shares ?? 0)} shares</span>
                    {featRow?.best_score ? <span>🏆 <strong>{featRow.best_score}</strong></span> : null}
                  </div>
                </div>
                <div className="psp-featured-side">
                  <div className="psp-featured-deco" aria-hidden="true">
                    <img src="/pieces/white-queen.png" alt="" className="psp-deco-piece psp-deco-q" />
                    <img src="/pieces/black-king.png" alt="" className="psp-deco-piece psp-deco-k" />
                    <img src="/pieces/white-rook.png" alt="" className="psp-deco-piece psp-deco-r" />
                    <img src="/pieces/black-bishop.png" alt="" className="psp-deco-piece psp-deco-b" />
                  </div>
                  <div className="psp-featured-actions">
                    <button
                      type="button"
                      className="psp-play-btn"
                      onClick={(event) => { event.stopPropagation(); onPlaySeed(featured.slug, featSetup); }}
                    >
                      ▶ Play Seed
                    </button>
                    <div className="psp-secondary-actions">
                      <button type="button" className="seed-icon-action psp-featured-icon" aria-label={`Share ${featured.displayName}`} onClick={(event) => { event.stopPropagation(); copySeedChallengeLink(featured.slug); }}><Share2 size={16} /></button>
                      <button type="button" className="seed-icon-action psp-featured-icon" aria-label={`${featured.displayName} leaderboard`} onClick={(event) => { event.stopPropagation(); onLeaderboard(featured.slug); }}><Trophy size={16} /></button>
                      <button type="button" className="seed-icon-action psp-featured-icon" aria-label={`Challenge friend on ${featured.displayName}`} onClick={(event) => { event.stopPropagation(); void onChallengeSeed(featured.slug, featSetup); }}><Users size={16} /></button>
                    </div>
                  </div>
                </div>
              </article>
            )}

            {/* Normal seed grid — remaining seeds */}
            <div className="seed-card-grid psp-grid">
              {rest.map((seed) => {
                const valid = createSeedFromInput(seed.slug);
                const setup = valid.ok ? valid.backRankCode : 'BQKRN';
                const row = statBySeed.get(seed.slug);
                return (
                  <article
                    className="seed-card seed-card-clickable psp-seed-card"
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
                    <div className="psp-card-header">
                      <h2 className="psp-card-title">{seed.displayName}</h2>
                      <span className="psp-card-slug">{seed.slug}</span>
                    </div>
                    <p className="psp-card-desc">{seed.description}</p>
                    <div className="seed-tag-row psp-card-tags">
                      {seed.tags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}
                    </div>
                    <div className="psp-card-setup">
                      <span className="psp-setup-label">Setup</span>
                      <SetupStrip code={setup} />
                    </div>
                    <div className="psp-card-stats">
                      <span><strong>{formatCount(row?.total_plays ?? 0)}</strong> plays</span>
                      <span className="psp-stats-dot">·</span>
                      <span><strong>{formatCount(row?.total_shares ?? 0)}</strong> shares</span>
                      {row?.best_score ? (
                        <>
                          <span className="psp-stats-dot">·</span>
                          <span>🏆 <strong>{row.best_score}</strong></span>
                        </>
                      ) : null}
                    </div>
                    <div className="psp-card-actions">
                      <button
                        type="button"
                        className="psp-play-btn"
                        onClick={(event) => { event.stopPropagation(); onPlaySeed(seed.slug, setup); }}
                      >
                        ▶ Play Seed
                      </button>
                      <div className="psp-secondary-actions">
                        <button type="button" className="seed-icon-action" aria-label={`Challenge friend on ${seed.displayName}`} onClick={(event) => { event.stopPropagation(); void onChallengeSeed(seed.slug, setup); }}><Users size={15} /></button>
                        <button type="button" className="seed-icon-action" aria-label={`Share ${seed.displayName}`} onClick={(event) => { event.stopPropagation(); copySeedChallengeLink(seed.slug); }}><Share2 size={15} /></button>
                        <button type="button" className="seed-icon-action" aria-label={`${seed.displayName} leaderboard`} onClick={(event) => { event.stopPropagation(); onLeaderboard(seed.slug); }}><Trophy size={15} /></button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {seeds.length === 0 && (
              <p className="seed-search-empty">No popular seeds found. Try searching for chess, anime, movie, tech, streamer, or a creator name.</p>
            )}
          </div>

          {/* Sticky sidebar */}
          <aside className="psp-sidebar">
            {/* Today's Daily panel */}
            <div className="psp-daily-panel">
              <div className="psp-daily-header">
                <Calendar size={16} />
                <span>Today's Daily</span>
              </div>
              <p className="psp-daily-tagline">A fresh setup every day.</p>
              <div className="psp-daily-setup">
                <SetupStrip code={dailySetup} />
                <span className="psp-daily-setup-code">Setup: <strong>{dailySetup}</strong></span>
              </div>
              {dailyStat != null && (
                <div className="psp-daily-stats">
                  <span>{formatCount(dailyStat.total_plays ?? 0)} plays</span>
                  <span>·</span>
                  <span>{formatCount(dailyStat.total_shares ?? 0)} shares</span>
                </div>
              )}
              <button
                type="button"
                className="psp-play-btn psp-daily-play"
                onClick={(event) => { event.stopPropagation(); onPlaySeed(dailySlug, dailySetup); }}
              >
                ▶ Play Daily
              </button>
              <button
                type="button"
                className="secondary-action psp-daily-challenge"
                onClick={(event) => { event.stopPropagation(); void onChallengeSeed(dailySlug, dailySetup); }}
              >
                <Users size={15} /> Challenge Friend
              </button>
            </div>

            {/* How It Works */}
            <div className="psp-how-it-works">
              <h3 className="psp-how-title">How It Works <span className="psp-how-icon">?</span></h3>
              <ul className="psp-how-list">
                <li><span className="psp-how-piece">♟</span> Pick a seed and play instantly.</li>
                <li><span className="psp-how-piece">🏆</span> Climb the leaderboard.</li>
                <li><span className="psp-how-piece">👥</span> Share and challenge your friends!</li>
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
