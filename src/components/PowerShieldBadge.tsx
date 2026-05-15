import { useState } from 'react';
import { createPortal } from 'react-dom';
import { getPowerRomanNumeral, type PlayerPowerTier } from '../game/playerPower.js';

type Props = {
  tier: PlayerPowerTier;
  label?: string;
  winStreak?: number;
  lossStreak?: number;
};

const shieldGroups = [
  { levels: 'I–III', title: 'Training', detail: 'Forgiving games for warmups, experiments, and loss streak recovery.' },
  { levels: 'IV–VI', title: 'Tactical', detail: 'Balanced games where the bot finds solid moves but still leaves chances.' },
  { levels: 'VII–VIII', title: 'Champion', detail: 'Sharper pressure on loose pieces and risky king safety.' },
  { levels: 'IX', title: 'Master', detail: 'Near-peak pressure where mistakes are punished quickly.' },
  { levels: 'X', title: 'Boss', detail: 'The strongest shield. The bot follows the top local-evaluator move.' },
] as const;

function getProgressMessage(tier: PlayerPowerTier, winStreak: number, lossStreak: number): string {
  if (tier === 10) return '🏆 Max power! You\'re running at full Boss strength.';
  if (lossStreak >= 2) return '😤 Break the streak — a win puts your shield back on the rise!';
  if (lossStreak === 1) return '💪 Shake it off. Win the next one and your shield recovers.';
  if (winStreak >= 2) return '🔥 On a hot streak! Wins are pushing your shield up.';
  if (winStreak === 1) return '⚡ Nice! One more win and your shield climbs higher.';
  return '🎯 Win your next game to push the shield up a level!';
}

export function PowerShieldBadge({ tier, label = 'Player power', winStreak, lossStreak }: Props) {
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const romanTier = getPowerRomanNumeral(tier);
  const guide = isGuideOpen ? (
    <div className="power-shield-guide-backdrop" role="presentation" onClick={() => setIsGuideOpen(false)}>
      <section className="power-shield-guide" role="dialog" aria-modal="true" aria-labelledby="power-shield-guide-title" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="power-shield-guide-close" aria-label="Close shield guide" onClick={() => setIsGuideOpen(false)}>×</button>
        <div className="power-shield-guide-hero">
          <span className={`power-shield-badge power-shield-tier-${tier}`} aria-hidden="true"><span className="power-shield-icon">{romanTier}</span></span>
          <div>
            <p className="eyebrow">Shield level</p>
            <h2 id="power-shield-guide-title">Power {romanTier}</h2>
            <p>Your shield shows how fierce the AI should be right now. Higher roman numerals mean stronger bot move choices.</p>
          </div>
        </div>
        <div className="power-shield-progress">
          <p className="power-shield-progress-label">Your power path</p>
          <div
            className="power-shield-progress-track"
            role="progressbar"
            aria-label={`Power level ${tier} out of 10`}
            aria-valuenow={tier}
            aria-valuemin={1}
            aria-valuemax={10}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((t) => (
              <div
                key={t}
                className={`power-shield-progress-pip power-shield-tier-${t}${t <= tier ? ' filled' : ''}${t === tier ? ' peak' : ''}`}
              />
            ))}
          </div>
          <p className="power-shield-progress-message">{getProgressMessage(tier, winStreak ?? 0, lossStreak ?? 0)}</p>
        </div>
        <ul className="power-shield-guide-list">
          {shieldGroups.map((group) => (
            <li className={group.levels.includes(romanTier) ? 'current-shield-group' : undefined} key={group.levels}>
              <span>{group.levels}</span>
              <strong>{group.title}</strong>
              <small>{group.detail}</small>
            </li>
          ))}
        </ul>
        <p className="power-shield-guide-note">Daily wins can raise the shield; loss streaks can soften it for the next rematch.</p>
      </section>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        className={`power-shield-badge power-shield-tier-${tier}`}
        aria-label={`${label} level ${romanTier}. Open shield level guide.`}
        title={`Power ${romanTier} · open shield guide`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsGuideOpen(true);
        }}
      >
        <span className="power-shield-icon" aria-hidden="true">{romanTier}</span>
      </button>
      {guide && typeof document !== 'undefined' ? createPortal(guide, document.body) : guide}
    </>
  );
}
