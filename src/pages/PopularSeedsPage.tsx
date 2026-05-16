import { useEffect, useMemo, useState } from 'react';
import { CopyCheck, Home, Search, Share2, Trophy, Users } from 'lucide-react';
import { CURATED_SEEDS } from '../game/curatedSeeds.js';
import { createSeedFromInput } from '../game/seed.js';
import { buildSeedShareMessage, getRandomShareTaunt } from '../game/shareTaunts.js';
import { fetchPopularSeedStats, recordSeedShare, type SeedStatsRecord } from '../multiplayer/challengeApi.js';

type SortMode = 'popular' | 'new' | 'highest' | 'shared' | 'daily';
type Props = { onPlaySeed: (seed: string, backRankCode?: string) => void; onChallengeSeed: (seed: string, backRankCode?: string) => void | Promise<void>; onOpenSeed: (seed: string) => void; onLeaderboard: (seed: string) => void; onHome: () => void };

function createPopularSeedUrl(seedSlug: string) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/seed/${encodeURIComponent(seedSlug)}`;
}

function getFallbackBackRankCode(seedSlug: string): string {
  const validation = createSeedFromInput(seedSlug);
  return validation.ok ? validation.backRankCode : 'BQKRN';
}

async function copySeedChallengeLink(seedSlug: string) {
  const shareText = buildSeedShareMessage({
    style: 'popularSeed',
    taunt: getRandomShareTaunt('friendChallenge'),
    seedSlug,
    backRankCode: getFallbackBackRankCode(seedSlug),
    challengeUrl: createPopularSeedUrl(seedSlug),
  });
  await navigator.clipboard?.writeText(shareText);
  return recordSeedShare({ seed: seedSlug, seed_slug: seedSlug, back_rank_code: getFallbackBackRankCode(seedSlug) });
}

export function PopularSeedsPage({ onPlaySeed, onChallengeSeed, onOpenSeed, onLeaderboard, onHome }: Props) {
  const [stats, setStats] = useState<SeedStatsRecord[]>([]);
  const [sort, setSort] = useState<SortMode>('popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedSeed, setCopiedSeed] = useState<string | null>(null);
  useEffect(() => { fetchPopularSeedStats().then(setStats).catch(() => setStats([])); }, []);

  function mergeUpdatedStats(updatedStats: SeedStatsRecord | null, seedSlug: string) {
    setStats((rows) => {
      const existing = rows.find((row) => row.seed_slug === seedSlug);
      const nextRow = updatedStats ?? {
        seed_slug: seedSlug,
        seed: seedSlug,
        back_rank_code: getFallbackBackRankCode(seedSlug),
        total_shares: (existing?.total_shares ?? 0) + 1,
      } as SeedStatsRecord;
      const withoutCurrent = rows.filter((row) => row.seed_slug !== seedSlug);
      return [...withoutCurrent, { ...existing, ...nextRow, total_shares: nextRow.total_shares ?? (existing?.total_shares ?? 0) + 1 }];
    });
  }

  async function handleShareSeed(seedSlug: string) {
    setCopiedSeed(seedSlug);
    try {
      const updatedStats = await copySeedChallengeLink(seedSlug);
      mergeUpdatedStats(updatedStats, seedSlug);
    } catch {
      mergeUpdatedStats(null, seedSlug);
    }
    window.setTimeout(() => setCopiedSeed((current) => (current === seedSlug ? null : current)), 3000);
  }

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

  return (
    <main className="challenge-page popular-seeds-page">
      <button type="button" className="seed-detail-home-button" aria-label="Go home" onClick={onHome}><Home size={22} /></button>
      <section className="challenge-card wide">
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
                <p className="seed-card-description">{seed.description}</p>
                <div className="seed-tag-row">{seed.tags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}</div>
                <div className="seed-card-highlight-stats" aria-label={`${seed.displayName} activity highlights`}>
                  <span><small>Plays</small><strong>{row?.total_plays ?? 0}</strong></span>
                  <span><small>Shares</small><strong>{row?.total_shares ?? 0}</strong></span>
                </div>
                <div className="seed-card-meta-row">
                  <span>Setup <b>{setup}</b></span>
                </div>
                <div className="seed-card-best-score">
                  <span>Leaderboard #1</span>
                  {row?.best_score ? (
                    <strong>{row.best_score}<small> by {row.best_score_player_name ?? 'Anonymous Player'}</small></strong>
                  ) : (
                    <strong>—<small> Play to claim it</small></strong>
                  )}
                </div>
                <div className="seed-card-action-stack">
                  <div className="seed-card-action-row">
                    <button type="button" onClick={(event) => { event.stopPropagation(); onPlaySeed(seed.slug, setup); }}>Play AI</button>
                    <button type="button" className="seed-icon-action" aria-label={copiedSeed === seed.slug ? `Copied ${seed.displayName}` : `Share ${seed.displayName}`} onClick={(event) => { event.stopPropagation(); void handleShareSeed(seed.slug); }}>{copiedSeed === seed.slug ? <CopyCheck size={16} /> : <Share2 size={16} />}</button>
                    <button type="button" className="seed-icon-action" aria-label={`${seed.displayName} leaderboard`} onClick={(event) => { event.stopPropagation(); onLeaderboard(seed.slug); }}><Trophy size={16} /></button>
                  </div>
                  <button type="button" className="secondary-action seed-challenge-action" onClick={(event) => { event.stopPropagation(); void onChallengeSeed(seed.slug, setup); }}><Users size={16} /> Challenge Friend</button>
                </div>
              </article>
            );
          })}
          {seeds.length === 0 && <p className="seed-search-empty">No popular seeds found. Try searching for chess, anime, movie, tech, streamer, or a creator name.</p>}
        </div>
        <div className="panel-actions centered-actions"><button type="button" onClick={onHome}><Home size={17} /> Home</button></div>
      </section>
    </main>
  );
}
