import { Home, Share2, Trophy, Users } from 'lucide-react';
import { createInitialBoard } from '../game/createInitialBoard.js';
import { CURATED_SEEDS, getSeedDisplayName, normalizeSeedSlug } from '../game/curatedSeeds.js';
import { createSeedChallengeUrl } from '../game/challenge.js';
import { createSeedFromInput } from '../game/seed.js';
import type { Piece } from '../game/types.js';

type Props = {
  seedSlug: string;
  onPlaySeed: (seed: string, backRankCode?: string) => void;
  onChallengeSeed: (seed: string, backRankCode?: string) => void | Promise<void>;
  onLeaderboard: (seed: string) => void;
  onOpenSeed: (seed: string) => void;
  onHome: () => void;
};

function pieceAlt(piece: Piece) { return `${piece.color} ${piece.type}`; }

export function SeedDetailPage({ seedSlug, onPlaySeed, onChallengeSeed, onLeaderboard, onOpenSeed, onHome }: Props) {
  const normalized = normalizeSeedSlug(seedSlug);
  const seed = CURATED_SEEDS.find((item) => item.slug === normalized);
  const validation = createSeedFromInput(normalized);
  const setup = validation.ok ? validation.backRankCode : 'BQKRN';
  const board = createInitialBoard({ backRankCode: setup });
  const others = CURATED_SEEDS.filter((item) => item.slug !== normalized).slice(0, 6);
  const title = seed?.displayName ?? getSeedDisplayName(normalized);
  const shareUrl = createSeedChallengeUrl(normalized);

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
              <button type="button" className="secondary-action" onClick={() => { void navigator.clipboard?.writeText(shareUrl); }}><Share2 size={17} /> Share</button>
              <button type="button" className="secondary-action" onClick={() => onLeaderboard(normalized)}><Trophy size={17} /> Leaderboard</button>
            </div>
          </div>
          <div className="seed-preview-board" aria-label={`${title} arrangement preview`}>
            {board.map((square, index) => (
              <span key={index} className={(square.file + square.rank) % 2 === 0 ? 'light' : 'dark'}>
                {square.piece && <img src={`/pieces/${square.piece.color}-${square.piece.type}.png`} alt={pieceAlt(square.piece)} draggable={false} />}
              </span>
            ))}
          </div>
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
                <article className="seed-card" key={item.slug}>
                  <h3>{item.displayName}</h3>
                  <strong>{item.slug}</strong>
                  <p>{item.description}</p>
                  <div className="panel-actions">
                    <button type="button" onClick={() => onOpenSeed(item.slug)}>Open</button>
                    <button type="button" className="secondary-action" onClick={() => { void onChallengeSeed(item.slug, nextSetup); }}><Users size={15} /> Challenge</button>
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
