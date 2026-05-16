import { useEffect, useMemo, useState } from 'react';
import { CopyCheck, Home, Share2, Trophy, Users } from 'lucide-react';
import { HomepageInteractiveBoard } from '../home/interactiveBoard/HomepageInteractiveBoard.js';
import { CURATED_SEEDS, getSeedDisplayName, normalizeSeedSlug } from '../game/curatedSeeds.js';
import { createSeedChallengeUrl } from '../game/challenge.js';
import { createSeedFromInput } from '../game/seed.js';
import { buildSeedShareMessage, getRandomShareTaunt } from '../game/shareTaunts.js';
import { getDisplayedSeedStats } from '../game/seedDefaultStats.js';
import { fetchPopularSeedStats, fetchSeedLeaderboard, recordSeedShare, type SeedScoreRecord, type SeedStatsRecord } from '../multiplayer/challengeApi.js';

type Props = {
  seedSlug: string;
  onPlaySeed: (seed: string, backRankCode?: string) => void;
  onChallengeSeed: (seed: string, backRankCode?: string) => void | Promise<void>;
  onLeaderboard: (seed: string) => void;
  onOpenSeed: (seed: string) => void;
  onHome: () => void;
};

function spacedCode(backRankCode: string): string {
  return backRankCode.split('').join(' ');
}

function getFallbackBackRankCode(seedSlug: string): string {
  const validation = createSeedFromInput(seedSlug);
  return validation.ok ? validation.backRankCode : 'BQKRN';
}

export function SeedDetailPage({ seedSlug, onPlaySeed, onChallengeSeed, onLeaderboard, onOpenSeed, onHome }: Props) {
  const normalized = normalizeSeedSlug(seedSlug);
  const seed = CURATED_SEEDS.find((item) => item.slug === normalized);
  const validation = createSeedFromInput(normalized);
  const setup = validation.ok ? validation.backRankCode : 'BQKRN';
  const blackSetup = [...setup].reverse().join('');
  const title = seed?.displayName ?? getSeedDisplayName(normalized);
  const shareUrl = createSeedChallengeUrl(normalized);
  const shareText = buildSeedShareMessage({ style: 'popularSeed', taunt: getRandomShareTaunt('friendChallenge'), seedSlug: normalized, backRankCode: setup, challengeUrl: shareUrl });
  const [stats, setStats] = useState<SeedStatsRecord | null>(null);
  const [popularStats, setPopularStats] = useState<SeedStatsRecord[]>([]);
  const [topScores, setTopScores] = useState<SeedScoreRecord[]>([]);
  const [copiedSeed, setCopiedSeed] = useState<string | null>(null);
  const topThree = useMemo(() => topScores.slice(0, 3), [topScores]);
  const displayStats = getDisplayedSeedStats(normalized, stats);
  const popularStatBySeed = useMemo(() => new Map(popularStats.map((row) => [row.seed_slug, row])), [popularStats]);
  const others = CURATED_SEEDS
    .filter((item) => item.slug !== normalized)
    .sort((a, b) => {
      const av = popularStatBySeed.get(a.slug);
      const bv = popularStatBySeed.get(b.slug);
      const aDisplayStats = getDisplayedSeedStats(a.slug, av);
      const bDisplayStats = getDisplayedSeedStats(b.slug, bv);
      return bDisplayStats.displayedShares - aDisplayStats.displayedShares
        || (bv?.total_completed ?? 0) - (av?.total_completed ?? 0)
        || bDisplayStats.displayedPlays - aDisplayStats.displayedPlays;
    })
    .slice(0, 8);

  useEffect(() => {
    let isCancelled = false;
    Promise.all([
      fetchPopularSeedStats().catch(() => [] as SeedStatsRecord[]),
      fetchSeedLeaderboard(normalized).catch(() => [] as SeedScoreRecord[]),
    ]).then(([statsRows, scores]) => {
      if (isCancelled) return;
      setPopularStats(statsRows);
      setStats(statsRows.find((row) => row.seed_slug === normalized) ?? null);
      setTopScores(scores.slice(0, 3));
    });
    return () => { isCancelled = true; };
  }, [normalized]);

  function applyShareStats(seedForShare: string, updatedStats: SeedStatsRecord | null) {
    const buildFallbackStats = (current: SeedStatsRecord | null | undefined): SeedStatsRecord => ({
      seed_slug: seedForShare,
      seed: seedForShare,
      back_rank_code: seedForShare === normalized ? setup : getFallbackBackRankCode(seedForShare),
      total_shares: (current?.total_shares ?? 0) + 1,
      total_plays: current?.total_plays ?? 0,
      total_completed: current?.total_completed ?? 0,
      best_score: current?.best_score ?? 0,
      best_score_player_name: current?.best_score_player_name ?? null,
      best_score_challenge_id: current?.best_score_challenge_id ?? null,
      last_played_at: current?.last_played_at ?? null,
      created_at: current?.created_at,
    });
    setPopularStats((rows) => {
      const existing = rows.find((row) => row.seed_slug === seedForShare);
      const nextRow = updatedStats ?? buildFallbackStats(existing);
      return [...rows.filter((row) => row.seed_slug !== seedForShare), nextRow];
    });
    if (seedForShare !== normalized) return;
    setStats((current) => updatedStats ?? buildFallbackStats(current));
  }

  async function shareSeed(seedForShare: string, backRankCode: string, text: string) {
    setCopiedSeed(seedForShare);
    try {
      await navigator.clipboard?.writeText(text);
      const updatedStats = await recordSeedShare({ seed: seedForShare, seed_slug: seedForShare, back_rank_code: backRankCode });
      applyShareStats(seedForShare, updatedStats);
    } catch {
      applyShareStats(seedForShare, null);
    }
    window.setTimeout(() => setCopiedSeed((current) => (current === seedForShare ? null : current)), 3000);
  }

  return (
    <main className="challenge-page seed-detail-page">
      <button type="button" className="seed-detail-home-button" aria-label="Go home" onClick={onHome}><Home size={22} /></button>
      <section className="challenge-card wide seed-detail-card">
        <div className="seed-detail-hero">
          <div className="seed-detail-copy">
            <p className="eyebrow">Popular seed</p>
            <h1>{title}</h1>
            <p>{seed?.description ?? 'A shared Pocket Shuffle Chess setup ready for rematches, AI practice, and friend challenges.'}</p>
            <div className="seed-detail-momentum" aria-label={`${title} activity highlights`}>
              <span className="seed-detail-momentum-card seed-detail-momentum-card-heat"><small>Seed Heat</small><strong>{displayStats.heat}</strong><em>Deterministic from seed text</em></span>
              <span className="seed-detail-momentum-card seed-detail-momentum-card-plays"><small>Plays</small><strong>{displayStats.formattedPlays}</strong><em>Default activity plus saved plays</em></span>
              <span className="seed-detail-momentum-card seed-detail-momentum-card-shares"><small>Shares</small><strong>{displayStats.formattedShares}</strong><em>Default activity plus saved shares</em></span>
            </div>
            <div className="seed-detail-facts">
              <span><small>Seed</small><strong>{normalized}</strong></span>
              <span><small>Back rank</small><strong>{setup}</strong></span>
              <span><small>Tags</small><strong>{seed?.tags.join(', ') || 'custom'}</strong></span>
            </div>
            <p className="panel-note">Both sides use this 5-piece back-rank order mirrored across the board, so everyone gets the same opening puzzle without memorized book lines.</p>
            <div className="panel-actions seed-detail-actions">
              <button type="button" onClick={() => onPlaySeed(normalized, setup)}>Play AI</button>
              <button type="button" onClick={() => { void onChallengeSeed(normalized, setup); }}><Users size={17} /> Challenge Friend</button>
              <button type="button" className="secondary-action" onClick={() => { void shareSeed(normalized, setup, shareText); }}>{copiedSeed === normalized ? <CopyCheck size={17} /> : <Share2 size={17} />} {copiedSeed === normalized ? 'Copied' : 'Share'}</button>
              <button type="button" className="secondary-action" onClick={() => onLeaderboard(normalized)}><Trophy size={17} /> Leaderboard</button>
            </div>
          </div>
          <aside className="today-setup-showcase seed-detail-showcase" aria-label={`${title} 5 by 6 setup preview`}>
            <span className="setup-spark setup-spark-left" aria-hidden="true" />
            <span className="setup-spark setup-spark-right" aria-hidden="true" />
            <div className="setup-header-pill"><span aria-hidden="true" />SEED SETUP<span aria-hidden="true" /></div>
            <HomepageInteractiveBoard key={normalized} backRankCode={setup} dailySeed={normalized} blackBackRankCode={blackSetup} />
            <div className="setup-summary-panel">
              <div className="setup-summary-copy">
                <span>POPULAR SEED</span>
                <p><strong>White (Bottom):</strong> {spacedCode(setup)}</p>
                <p><strong>Black (Top):</strong> {spacedCode(blackSetup)}</p>
              </div>
              <div className="setup-seed-block">
                <span>SEED</span>
                <strong>{setup}</strong>
              </div>
            </div>
          </aside>
        </div>
        <section className="seed-detail-leaderboard-section" aria-labelledby="seed-detail-leaderboard-heading">
          <div className="seed-detail-section-heading">
            <p className="eyebrow">Leaderboard</p>
            <h2 id="seed-detail-leaderboard-heading">Top rank holders for this seed</h2>
            <button type="button" className="secondary-action" onClick={() => onLeaderboard(normalized)}><Trophy size={17} /> View full leaderboard</button>
          </div>
          <div className="seed-detail-top-ranks" aria-label={`${title} top 3 rank holders`}>
            {topThree.length > 0 ? topThree.map((score, index) => (
              <p key={score.id}><b>#{index + 1}</b><strong>{score.player_name ?? 'Anonymous Player'}</strong><em>{score.score}</em><small>{score.moves} moves</small></p>
            )) : <p><b>—</b><strong>No scores yet</strong><em>Play now</em><small>Be the first ranked player</small></p>}
          </div>
        </section>
        <section className="seed-loop-section seed-loop-featured-section">
          <div className="seed-detail-section-heading">
            <p className="eyebrow">More popular games</p>
            <h2>Other seeds getting plays and shares</h2>
            <p>Jump into another community-favorite setup with one tap, or send it as a quick friend challenge.</p>
          </div>
          <div className="seed-card-grid seed-loop-grid">
            {others.map((item) => {
              const nextSetup = getFallbackBackRankCode(item.slug);
              const nextShareText = buildSeedShareMessage({ style: 'popularSeed', taunt: getRandomShareTaunt('friendChallenge'), seedSlug: item.slug, backRankCode: nextSetup, challengeUrl: createSeedChallengeUrl(item.slug) });
              const nextDisplayStats = getDisplayedSeedStats(item.slug, popularStatBySeed.get(item.slug));
              return (
                <article
                  className="seed-card seed-card-clickable seed-loop-card"
                  key={item.slug}
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenSeed(item.slug)}
                  onKeyDown={(event) => {
                    if ((event.key === 'Enter' || event.key === ' ') && event.currentTarget === event.target) {
                      event.preventDefault();
                      onOpenSeed(item.slug);
                    }
                  }}
                >
                  <span className="seed-loop-kicker">Popular challenge</span>
                  <h3>{item.displayName}</h3>
                  <strong>{item.slug}</strong>
                  <p>{item.description}</p>
                  <div className="seed-card-meta-row seed-loop-meta-row">
                    <span>Seed Heat <b>{nextDisplayStats.heat}</b></span>
                    <span>{nextDisplayStats.formattedPlays} plays</span>
                    <span>{nextDisplayStats.formattedShares} shares</span>
                    <span>Setup <b>{nextSetup}</b></span>
                  </div>
                  <div className="seed-card-action-stack">
                    <div className="seed-card-action-row">
                      <button type="button" onClick={(event) => { event.stopPropagation(); onPlaySeed(item.slug, nextSetup); }}>Play AI</button>
                      <button type="button" className="seed-icon-action" aria-label={copiedSeed === item.slug ? `Copied ${item.displayName}` : `Share ${item.displayName}`} onClick={(event) => { event.stopPropagation(); void shareSeed(item.slug, nextSetup, nextShareText); }}>{copiedSeed === item.slug ? <CopyCheck size={15} /> : <Share2 size={15} />}</button>
                      <button type="button" className="seed-icon-action" aria-label={`${item.displayName} leaderboard`} onClick={(event) => { event.stopPropagation(); onLeaderboard(item.slug); }}><Trophy size={15} /></button>
                    </div>
                    <button type="button" className="secondary-action seed-challenge-action" onClick={(event) => { event.stopPropagation(); void onChallengeSeed(item.slug, nextSetup); }}><Users size={15} /> Challenge Friend</button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}
