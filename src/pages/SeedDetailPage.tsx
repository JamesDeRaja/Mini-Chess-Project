import { Home, Share2, Trophy, Users } from 'lucide-react';
import { HomepageInteractiveBoard } from '../home/interactiveBoard/HomepageInteractiveBoard.js';
import { CURATED_SEEDS, getSeedDisplayName, normalizeSeedSlug } from '../game/curatedSeeds.js';
import { createSeedChallengeUrl } from '../game/challenge.js';
import { createSeedFromInput } from '../game/seed.js';
import { buildSeedShareMessage, getRandomShareTaunt } from '../game/shareTaunts.js';

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

export function SeedDetailPage({ seedSlug, onPlaySeed, onChallengeSeed, onLeaderboard, onOpenSeed, onHome }: Props) {
  const normalized = normalizeSeedSlug(seedSlug);
  const seed = CURATED_SEEDS.find((item) => item.slug === normalized);
  const validation = createSeedFromInput(normalized);
  const setup = validation.ok ? validation.backRankCode : 'BQKRN';
  const blackSetup = [...setup].reverse().join('');
  const others = CURATED_SEEDS.filter((item) => item.slug !== normalized).slice(0, 8);
  const title = seed?.displayName ?? getSeedDisplayName(normalized);
  const shareUrl = createSeedChallengeUrl(normalized);
  const shareText = buildSeedShareMessage({ style: 'popularSeed', taunt: getRandomShareTaunt('friendChallenge'), seedSlug: normalized, backRankCode: setup, challengeUrl: shareUrl });

  return (
    <main className="challenge-page seed-detail-page">
      <button type="button" className="seed-detail-home-button" aria-label="Go home" onClick={onHome}><Home size={22} /></button>
      <section className="challenge-card wide seed-detail-card">
        <div className="seed-detail-hero">
          <div className="seed-detail-copy">
            <p className="eyebrow">Popular seed</p>
            <h1>{title}</h1>
            <p>{seed?.description ?? 'A shared Pocket Shuffle Chess setup ready for rematches, AI practice, and friend challenges.'}</p>
            <div className="seed-detail-facts">
              <span><small>Seed</small><strong>{normalized}</strong></span>
              <span><small>Back rank</small><strong>{setup}</strong></span>
              <span><small>Tags</small><strong>{seed?.tags.join(', ') || 'custom'}</strong></span>
            </div>
            <p className="panel-note">Both sides use this 5-piece back-rank order mirrored across the board, so everyone gets the same opening puzzle without memorized book lines.</p>
            <div className="panel-actions seed-detail-actions">
              <button type="button" onClick={() => onPlaySeed(normalized, setup)}>Play AI</button>
              <button type="button" onClick={() => { void onChallengeSeed(normalized, setup); }}><Users size={17} /> Challenge Friend</button>
              <button type="button" className="secondary-action" onClick={() => { void navigator.clipboard?.writeText(shareText); }}><Share2 size={17} /> Share</button>
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
        <section className="seed-loop-section">
          <div>
            <p className="eyebrow">Keep exploring</p>
            <h2>Other popular seeds to try</h2>
          </div>
          <div className="seed-card-grid seed-loop-grid">
            {others.map((item) => {
              const nextValidation = createSeedFromInput(item.slug);
              const nextSetup = nextValidation.ok ? nextValidation.backRankCode : 'BQKRN';
              return (
                <article
                  className="seed-card seed-card-clickable"
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
                  <h3>{item.displayName}</h3>
                  <strong>{item.slug}</strong>
                  <p>{item.description}</p>
                  <div className="seed-card-action-stack">
                    <div className="seed-card-action-row">
                      <button type="button" onClick={(event) => { event.stopPropagation(); onPlaySeed(item.slug, nextSetup); }}>Play AI</button>
                      <button type="button" className="seed-icon-action" aria-label={`Share ${item.displayName}`} onClick={(event) => { event.stopPropagation(); void navigator.clipboard?.writeText(buildSeedShareMessage({ style: 'popularSeed', taunt: getRandomShareTaunt('friendChallenge'), seedSlug: item.slug, backRankCode: nextSetup, challengeUrl: createSeedChallengeUrl(item.slug) })); }}><Share2 size={15} /></button>
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
