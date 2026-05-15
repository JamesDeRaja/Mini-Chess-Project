import { useState } from 'react';
import { createPortal } from 'react-dom';
import { SHIELD_PIPS_PER_TIER } from '../game/shieldProgression.js';
import { getPowerRomanNumeral, type PlayerPowerTier } from '../game/playerPower.js';

type Props = {
  tier: PlayerPowerTier;
  pips: number;
  label?: string;
};

const shieldGroups = [
  { levels: 'I–III', title: 'Training', detail: 'Forgiving games for warmups, experiments, and loss streak recovery.' },
  { levels: 'IV–VI', title: 'Tactical', detail: 'Balanced games where the bot finds solid moves but still leaves chances.' },
  { levels: 'VII–VIII', title: 'Champion', detail: 'Sharper pressure on loose pieces and risky king safety.' },
  { levels: 'IX', title: 'Master', detail: 'Near-peak pressure where mistakes are punished quickly.' },
  { levels: 'X', title: 'Boss', detail: 'The strongest shield. The bot follows the top local-evaluator move.' },
] as const;

function getProgressMessage(tier: PlayerPowerTier, pips: number): string {
  if (tier === 10) return '🏆 Maximum power! You\'re at full Boss strength.';
  const remaining = SHIELD_PIPS_PER_TIER - pips;
  const nextRoman = getPowerRomanNumeral((tier + 1) as PlayerPowerTier);
  if (remaining === 1) return `⚡ One more win and your shield evolves to Power ${nextRoman}!`;
  if (pips >= 3) return `🔥 Getting close — just ${remaining} wins to become Power ${nextRoman}!`;
  return `🎯 Win ${remaining} more game${remaining === 1 ? '' : 's'} to reach Power ${nextRoman}!`;
}

export function PowerShieldBadge({ tier, pips, label = 'Player power' }: Props) {
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
        <div className={`power-shield-progress power-shield-tier-${tier}`}>
          <p className="power-shield-progress-label">
            {tier < 10
              ? `Progress to Power ${getPowerRomanNumeral((tier + 1) as PlayerPowerTier)}`
              : 'Peak power reached'}
          </p>
          <div
            className="power-shield-progress-track"
            role="progressbar"
            aria-label={`${pips} of ${SHIELD_PIPS_PER_TIER} wins toward next shield level`}
            aria-valuenow={pips}
            aria-valuemin={0}
            aria-valuemax={SHIELD_PIPS_PER_TIER}
          >
            {Array.from({ length: SHIELD_PIPS_PER_TIER }, (_, i) => (
              <div
                key={i}
                className={`power-shield-progress-pip${i < pips ? ' filled' : ''}${i === pips - 1 ? ' peak' : ''}`}
              />
            ))}
          </div>
          <p className="power-shield-progress-message">{getProgressMessage(tier, pips)}</p>
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
        <p className="power-shield-guide-note">Win games to fill the bar and evolve your shield. Losses drain one pip.</p>
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
