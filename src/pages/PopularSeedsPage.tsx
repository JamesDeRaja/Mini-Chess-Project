import { useEffect, useMemo, useState } from 'react';
import { Heart, Home, Search, Share2, Sparkles, Trophy, Users } from 'lucide-react';
import { CURATED_SEEDS } from '../game/curatedSeeds.js';
import { createSeedFromInput } from '../game/seed.js';
import { buildSeedShareMessage, getRandomShareTaunt } from '../game/shareTaunts.js';
import { fetchPopularSeedStats, type SeedStatsRecord } from '../multiplayer/challengeApi.js';

type SortMode = 'popular' | 'new' | 'highest' | 'shared' | 'daily' | 'saved';
type TagFilter = { id: string; label: string; emoji: string; tags: string[] };

const FAVOURITE_SEEDS_STORAGE_KEY = 'pocket_shuffle_favourite_seeds';

const TAG_FILTERS: TagFilter[] = [
  { id: 'all', label: 'All Seeds', emoji: '✨', tags: [] },
  { id: 'chess', label: 'Chess', emoji: '♟️', tags: ['chess', 'grandmaster', 'opening', 'classic'] },
  { id: 'anime', label: 'Anime', emoji: '⚡', tags: ['anime', 'pokemon', 'ninja'] },
  { id: 'movies-tv', label: 'Movies & TV', emoji: '🎬', tags: ['movie', 'tv', 'animated', 'superhero', 'sci-fi'] },
  { id: 'streamers', label: 'Streamers', emoji: '🎮', tags: ['streamer', 'youtube', 'creator'] },
  { id: 'viral', label: 'Viral', emoji: '🔥', tags: ['viral', 'meme', 'tiktok'] },
  { id: 'sports', label: 'Sports', emoji: '⚽', tags: ['sports'] },
];

function readFavouriteSeeds() {
  if (typeof localStorage === 'undefined') return new Set<string>();
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVOURITE_SEEDS_STORAGE_KEY) ?? '[]');
    return new Set(Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : []);
  } catch {
    return new Set<string>();
  }
}

function writeFavouriteSeeds(favourites: Set<string>) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(FAVOURITE_SEEDS_STORAGE_KEY, JSON.stringify([...favourites]));
}
type Props = { onPlaySeed: (seed: string, backRankCode?: string) => void; onChallengeSeed: (seed: string, backRankCode?: string) => void | Promise<void>; onOpenSeed: (seed: string) => void; onLeaderboard: (seed: string) => void; onHome: () => void };

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

export function PopularSeedsPage({ onPlaySeed, onChallengeSeed, onOpenSeed, onLeaderboard, onHome }: Props) {
  const [stats, setStats] = useState<SeedStatsRecord[]>([]);
  const [sort, setSort] = useState<SortMode>('popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('all');
  const [favouriteSeeds, setFavouriteSeeds] = useState<Set<string>>(() => readFavouriteSeeds());

  useEffect(() => { fetchPopularSeedStats().then(setStats).catch(() => setStats([])); }, []);

  const toggleFavouriteSeed = (seedSlug: string) => {
    setFavouriteSeeds((current) => {
      const next = new Set(current);
      if (next.has(seedSlug)) next.delete(seedSlug);
      else next.add(seedSlug);
      writeFavouriteSeeds(next);
      return next;
    });
  };
  const statBySeed = useMemo(() => new Map(stats.map((row) => [row.seed_slug, row])), [stats]);
  const selectedFilter = TAG_FILTERS.find((filter) => filter.id === selectedTagFilter) ?? TAG_FILTERS[0];
  const seeds = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return [...CURATED_SEEDS]
      .filter((seed) => {
        if (sort === 'saved' && !favouriteSeeds.has(seed.slug)) return false;
        if (selectedFilter.tags.length > 0 && !seed.tags.some((tag) => selectedFilter.tags.includes(tag))) return false;
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
        if (sort === 'saved') return a.displayName.localeCompare(b.displayName);
        if (sort === 'new') return b.slug.localeCompare(a.slug);
        return (bv?.total_shares ?? 0) - (av?.total_shares ?? 0) || (bv?.total_completed ?? 0) - (av?.total_completed ?? 0) || (bv?.total_plays ?? 0) - (av?.total_plays ?? 0);
      });
  }, [favouriteSeeds, searchQuery, selectedFilter.tags, sort, statBySeed]);

  return (
    <main className="challenge-page popular-seeds-page">
      <button type="button" className="seed-detail-home-button" aria-label="Go home" onClick={onHome}><Home size={22} /></button>
      <section className="challenge-card wide">
        <div className="popular-seeds-hero">
          <span className="popular-seeds-hero-icon" aria-hidden="true"><Sparkles size={22} /></span>
          <p className="eyebrow">Browse Seeds</p>
          <h1>Popular Seeds</h1>
          <p>Discover curated setups, save your favourites, and challenge friends from any screen size.</p>
        </div>
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
        <div className="popular-seed-chip-row" aria-label="Filter popular seeds by tag">
          {TAG_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={selectedTagFilter === filter.id ? 'selected' : ''}
              aria-pressed={selectedTagFilter === filter.id}
              onClick={() => setSelectedTagFilter(filter.id)}
            >
              <span aria-hidden="true">{filter.emoji}</span> {filter.label}
            </button>
          ))}
        </div>
        <div className="leaderboard-tabs" aria-label="Sort popular seeds">
          {([
            ['popular', 'Popular'],
            ['new', 'New'],
            ['highest', 'Top Score'],
            ['daily', 'Daily'],
            ['saved', 'Saved'],
          ] as [SortMode, string][]).map(([mode, label]) => (
            <button key={mode} className={sort === mode ? 'selected' : ''} type="button" onClick={() => setSort(mode)}>
              {mode === 'saved' && <Heart size={15} aria-hidden="true" />}
              {label}
            </button>
          ))}
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
                <button
                  type="button"
                  className={`seed-favourite-action ${favouriteSeeds.has(seed.slug) ? 'selected' : ''}`}
                  aria-label={`${favouriteSeeds.has(seed.slug) ? 'Remove' : 'Save'} ${seed.displayName} favourite`}
                  aria-pressed={favouriteSeeds.has(seed.slug)}
                  onClick={(event) => { event.stopPropagation(); toggleFavouriteSeed(seed.slug); }}
                >
                  <Heart size={19} fill={favouriteSeeds.has(seed.slug) ? 'currentColor' : 'none'} />
                </button>
                <h2>{seed.displayName}</h2>
                <strong>{seed.slug}</strong>
                <p className="seed-card-description">{seed.description}</p>
                <div className="seed-tag-row">{seed.tags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}</div>
                <p>Setup: <b>{setup}</b></p>
                <p>Plays: {row?.total_plays ?? 0} · Shares: {row?.total_shares ?? 0}</p>
                <p>Best Score: {row?.best_score ? `${row.best_score} by ${row.best_score_player_name ?? 'Anonymous Player'}` : '—'}</p>
                <div className="seed-card-action-stack">
                  <div className="seed-card-action-row">
                    <button type="button" onClick={(event) => { event.stopPropagation(); onPlaySeed(seed.slug, setup); }}>Play AI</button>
                    <button type="button" className="seed-icon-action" aria-label={`Share ${seed.displayName}`} onClick={(event) => { event.stopPropagation(); copySeedChallengeLink(seed.slug); }}><Share2 size={16} /></button>
                    <button type="button" className="seed-icon-action" aria-label={`${seed.displayName} leaderboard`} onClick={(event) => { event.stopPropagation(); onLeaderboard(seed.slug); }}><Trophy size={16} /></button>
                  </div>
                  <button type="button" className="secondary-action seed-challenge-action" onClick={(event) => { event.stopPropagation(); void onChallengeSeed(seed.slug, setup); }}><Users size={16} /> Challenge Friend</button>
                </div>
              </article>
            );
          })}
          {seeds.length === 0 && <p className="seed-search-empty">No popular seeds found. Try another search, tag chip, or save a favourite seed first.</p>}
        </div>
        <div className="panel-actions centered-actions"><button type="button" onClick={onHome}><Home size={17} /> Home</button></div>
      </section>
    </main>
  );
}
