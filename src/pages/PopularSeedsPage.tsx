import { useEffect, useMemo, useState } from 'react';
import { Check, Heart, Home, Search, Share2, Trophy, Users } from 'lucide-react';
import { CURATED_SEEDS } from '../game/curatedSeeds.js';
import { createSeedFromInput } from '../game/seed.js';
import { buildSeedShareMessage, getRandomShareTaunt } from '../game/shareTaunts.js';
import { fetchPopularSeedStats, type SeedStatsRecord } from '../multiplayer/challengeApi.js';

type SortMode = 'popular' | 'new' | 'highest' | 'daily' | 'saved';
type Category = 'all' | 'chess' | 'anime' | 'movies' | 'streamers' | 'viral' | 'sports';

type Props = {
  onPlaySeed: (seed: string, backRankCode?: string) => void;
  onChallengeSeed: (seed: string, backRankCode?: string) => void | Promise<void>;
  onOpenSeed: (seed: string) => void;
  onLeaderboard: (seed: string) => void;
  onHome: () => void;
};

const CATEGORIES: { id: Category; label: string; tags: string[] }[] = [
  { id: 'all', label: 'All Seeds', tags: [] },
  { id: 'chess', label: '♟ Chess', tags: ['chess', 'grandmaster', 'champion', 'legend'] },
  { id: 'anime', label: '⚡ Anime', tags: ['anime'] },
  { id: 'movies', label: '🎬 Movies & TV', tags: ['movie', 'tv', 'superhero', 'animated', 'sci-fi', 'fantasy', 'drama', 'action'] },
  { id: 'streamers', label: '🎮 Streamers', tags: ['streamer'] },
  { id: 'viral', label: '🔥 Viral', tags: ['viral', 'meme', 'tiktok', 'influencer', 'youtube', 'celebrity', 'pop', 'music'] },
  { id: 'sports', label: '⚽ Sports', tags: ['sports'] },
];

const SORT_LABELS: Record<SortMode, string> = {
  popular: 'Popular',
  new: 'New',
  highest: 'Top Score',
  daily: 'Daily',
  saved: 'Saved',
};

const FAVOURITES_KEY = 'psc_favourite_seeds';

function loadFavourites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVOURITES_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveFavourites(slugs: Set<string>) {
  try {
    localStorage.setItem(FAVOURITES_KEY, JSON.stringify([...slugs]));
  } catch { /* ignore */ }
}

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
  const [category, setCategory] = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [favourites, setFavourites] = useState<Set<string>>(loadFavourites);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  useEffect(() => { fetchPopularSeedStats().then(setStats).catch(() => setStats([])); }, []);

  const statBySeed = useMemo(() => new Map(stats.map((row) => [row.seed_slug, row])), [stats]);

  function toggleFavourite(slug: string, event: React.MouseEvent) {
    event.stopPropagation();
    setFavourites((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) { next.delete(slug); } else { next.add(slug); }
      saveFavourites(next);
      return next;
    });
  }

  function handleShare(seedSlug: string, event: React.MouseEvent) {
    event.stopPropagation();
    copySeedChallengeLink(seedSlug);
    setCopiedSlug(seedSlug);
    setTimeout(() => setCopiedSlug(null), 2000);
  }

  const seeds = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return [...CURATED_SEEDS]
      .filter((seed) => {
        if (sort === 'saved') return favourites.has(seed.slug);
        if (category !== 'all') {
          const cat = CATEGORIES.find((c) => c.id === category);
          if (cat && !seed.tags.some((t) => cat.tags.includes(t))) return false;
        }
        if (query) {
          const text = [seed.slug, seed.displayName, seed.description, ...seed.tags, ...(seed.aliases ?? [])].join(' ').toLowerCase();
          return text.includes(query);
        }
        return true;
      })
      .sort((a, b) => {
        const av = statBySeed.get(a.slug);
        const bv = statBySeed.get(b.slug);
        if (sort === 'highest') return (bv?.best_score ?? 0) - (av?.best_score ?? 0);
        if (sort === 'daily') return Number(b.tags.includes('daily')) - Number(a.tags.includes('daily'));
        if (sort === 'new') return b.slug.localeCompare(a.slug);
        if (sort === 'saved') return 0;
        return (bv?.total_shares ?? 0) - (av?.total_shares ?? 0) || (bv?.total_completed ?? 0) - (av?.total_completed ?? 0) || (bv?.total_plays ?? 0) - (av?.total_plays ?? 0);
      });
  }, [searchQuery, sort, category, statBySeed, favourites]);

  return (
    <main className="challenge-page popular-seeds-page">
      <button type="button" className="seed-detail-home-button" aria-label="Go home" onClick={onHome}><Home size={22} /></button>
      <section className="challenge-card wide">
        <p className="eyebrow">Browse Seeds</p>
        <h1>Popular Seeds</h1>
        <p>Discover curated setups, save your favourites, and challenge friends.</p>

        <label className="popular-seed-search">
          <Search size={20} aria-hidden="true" />
          <span className="sr-only">Search popular seeds</span>
          <input
            type="search"
            value={searchQuery}
            placeholder="Search by name, theme, creator, or tag…"
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <small>{seeds.length} seeds</small>
        </label>

        <div className="seed-category-chips">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`seed-category-chip${category === cat.id ? ' active' : ''}`}
              onClick={() => { setCategory(cat.id); if (sort === 'saved') setSort('popular'); }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="leaderboard-tabs popular-seeds-page-tabs">
          {(['popular', 'new', 'highest', 'daily', 'saved'] as SortMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              className={sort === mode ? 'selected' : ''}
              onClick={() => setSort(mode)}
            >
              {mode === 'saved'
                ? <><Heart size={13} className="tab-heart-icon" />{favourites.size > 0 ? `Saved (${favourites.size})` : 'Saved'}</>
                : SORT_LABELS[mode]}
            </button>
          ))}
        </div>

        {sort === 'saved' && seeds.length === 0 && (
          <div className="seed-saved-empty">
            <Heart size={36} />
            <strong>No saved seeds yet</strong>
            <p>Tap the heart on any seed to save it here for quick access.</p>
          </div>
        )}

        <div className="seed-bento-grid">
          {seeds.map((seed, index) => {
            const valid = createSeedFromInput(seed.slug);
            const setup = valid.ok ? valid.backRankCode : 'BQKRN';
            const row = statBySeed.get(seed.slug);
            const isFav = favourites.has(seed.slug);
            const isCopied = copiedSlug === seed.slug;
            const isFeatured = sort === 'popular' && index < 2 && category === 'all' && !searchQuery;

            return (
              <article
                key={seed.slug}
                className={`seed-card seed-card-clickable${isFeatured ? ' seed-card-featured' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => onOpenSeed(seed.slug)}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && e.currentTarget === e.target) {
                    e.preventDefault();
                    onOpenSeed(seed.slug);
                  }
                }}
              >
                <div className="seed-card-top">
                  <div className="seed-card-header">
                    <h2>{seed.displayName}</h2>
                    <button
                      type="button"
                      className={`seed-fav-btn${isFav ? ' active' : ''}`}
                      aria-label={isFav ? `Remove ${seed.displayName} from saved` : `Save ${seed.displayName}`}
                      onClick={(e) => toggleFavourite(seed.slug, e)}
                    >
                      <Heart size={17} />
                    </button>
                  </div>
                  <p className="seed-card-description">{seed.description}</p>
                  <div className="seed-tag-row">{seed.tags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}</div>
                  {(row?.total_plays || row?.best_score) ? (
                    <div className="seed-card-stats">
                      {!!row?.total_plays && <span>{row.total_plays} plays</span>}
                      {!!row?.best_score && <span>Best: {row.best_score}{row.best_score_player_name ? ` · ${row.best_score_player_name}` : ''}</span>}
                    </div>
                  ) : null}
                </div>

                <div className="seed-card-action-stack">
                  <div className="seed-card-action-row">
                    <button type="button" onClick={(e) => { e.stopPropagation(); onPlaySeed(seed.slug, setup); }}>
                      Play AI
                    </button>
                    <button
                      type="button"
                      className="seed-icon-action"
                      aria-label={isCopied ? 'Link copied!' : `Share ${seed.displayName}`}
                      onClick={(e) => handleShare(seed.slug, e)}
                    >
                      {isCopied ? <Check size={16} /> : <Share2 size={16} />}
                    </button>
                    <button
                      type="button"
                      className="seed-icon-action"
                      aria-label={`${seed.displayName} leaderboard`}
                      onClick={(e) => { e.stopPropagation(); onLeaderboard(seed.slug); }}
                    >
                      <Trophy size={16} />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="secondary-action seed-challenge-action"
                    onClick={(e) => { e.stopPropagation(); void onChallengeSeed(seed.slug, setup); }}
                  >
                    <Users size={16} /> Challenge Friend
                  </button>
                </div>
              </article>
            );
          })}
          {sort !== 'saved' && seeds.length === 0 && (
            <p className="seed-search-empty">No seeds found. Try a different search or category.</p>
          )}
        </div>

        <div className="panel-actions centered-actions">
          <button type="button" onClick={onHome}><Home size={17} /> Home</button>
        </div>
      </section>
    </main>
  );
}
