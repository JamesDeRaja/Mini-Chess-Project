import { useEffect, useMemo, useState } from 'react';
import { Copy, Home, Trophy } from 'lucide-react';
import { fetchChallenge, type ChallengeRecord } from '../multiplayer/challengeApi.js';
import { getRandomLandingTaunt } from '../game/shareTaunts.js';
import { normalizeSeedSlug } from '../game/curatedSeeds.js';
import type { ActiveChallengeContext } from '../game/challenge.js';

type Props = { challengeId: string; onPlayChallenge: (context: ActiveChallengeContext) => void; onSeedLeaderboard: (seedSlug: string) => void; onHome: () => void; onDaily: () => void };

function spaced(code: string) { return code.split('').join(' '); }

export function ChallengeLandingPage({ challengeId, onPlayChallenge, onSeedLeaderboard, onHome, onDaily }: Props) {
  const [challenge, setChallenge] = useState<ChallengeRecord | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading');
  useEffect(() => { let live = true; fetchChallenge(challengeId).then((record) => { if (!live) return; setChallenge(record); setStatus(record ? 'ready' : 'missing'); }).catch(() => { if (live) setStatus('missing'); }); return () => { live = false; }; }, [challengeId]);
  const taunt = useMemo(() => challenge ? getRandomLandingTaunt({ challengerName: challenge.challenger_name ?? 'Anonymous Player', score: challenge.challenger_score }) : '', [challenge]);
  if (status === 'loading') return <main className="challenge-page"><section className="challenge-card"><p className="eyebrow">Challenge</p><h1>Loading challenge…</h1></section></main>;
  if (!challenge) return <main className="challenge-page"><section className="challenge-card"><p className="eyebrow">Challenge not found</p><h1>Challenge not found.</h1><p>This challenge may be unavailable, but you can still play today’s daily seed.</p><div className="panel-actions centered-actions"><button type="button" onClick={onDaily}>Play Today&apos;s Daily</button><button type="button" onClick={onHome}><Home size={17} /> Home</button></div></section></main>;
  const seedSlug = normalizeSeedSlug(challenge.seed_slug);
  const playerName = challenge.challenger_name ?? 'Anonymous Player';
  return (
    <main className="challenge-page">
      <section className="challenge-card">
        <p className="eyebrow">Seed Challenge</p>
        <h1>{playerName} challenged you.</h1>
        <div className="challenge-stats-grid">
          <span>Score to beat <strong>{challenge.challenger_score}</strong></span>
          <span>Seed <strong>{seedSlug}</strong></span>
          <span>Setup <strong>{spaced(challenge.back_rank_code)}</strong></span>
          <span>Moves <strong>{challenge.challenger_moves}</strong></span>
        </div>
        <blockquote>“{taunt}”</blockquote>
        <p>Beat {playerName}&apos;s score on the same setup.</p>
        <div className="panel-actions centered-actions">
          <button type="button" onClick={() => onPlayChallenge({ challengeId: challenge.id, seed: challenge.seed, seedSlug, backRankCode: challenge.back_rank_code, previousPlayerName: playerName, previousScore: challenge.challenger_score, previousMoves: challenge.challenger_moves, chainRootId: challenge.chain_root_id ?? challenge.id, chainDepth: challenge.chain_depth })}>Play Challenge</button>
          <button type="button" className="secondary-action" onClick={() => onSeedLeaderboard(seedSlug)}><Trophy size={17} /> View Leaderboard</button>
          <button type="button" onClick={() => { void navigator.clipboard?.writeText(seedSlug); }}><Copy size={17} /> Copy Seed</button>
          <button type="button" onClick={onHome}><Home size={17} /> Home</button>
        </div>
      </section>
    </main>
  );
}
