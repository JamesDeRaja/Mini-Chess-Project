import { useState } from 'react';
import { getPowerRomanNumeral, type PlayerPowerTier } from '../game/playerPower.js';

type Props = {
  tier: PlayerPowerTier;
  label?: string;
};

const shieldGroups = [
  { levels: 'I–III', title: 'Training shield', detail: 'A forgiving bot profile for warming up, experimenting, and recovering from losses.' },
  { levels: 'IV–VI', title: 'Tactical shield', detail: 'A balanced profile where the bot finds solid moves but still leaves room for human tactics.' },
  { levels: 'VII–VIII', title: 'Champion shield', detail: 'A sharper profile that pressures loose pieces and rewards careful calculation.' },
  { levels: 'IX', title: 'Master shield', detail: 'A near-peak profile where mistakes are punished quickly.' },
  { levels: 'X', title: 'Boss shield', detail: 'The strongest profile. The bot consistently follows the top move from the local evaluator.' },
] as const;

export function PowerShieldBadge({ tier, label = 'Player power' }: Props) {
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const romanTier = getPowerRomanNumeral(tier);

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
      {isGuideOpen && (
        <div className="power-shield-guide-backdrop" role="presentation" onClick={() => setIsGuideOpen(false)}>
          <section className="power-shield-guide" role="dialog" aria-modal="true" aria-labelledby="power-shield-guide-title" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="power-shield-guide-close" aria-label="Close shield guide" onClick={() => setIsGuideOpen(false)}>×</button>
            <p className="eyebrow">Shield levels</p>
            <h2 id="power-shield-guide-title">Power {romanTier}</h2>
            <p>Your shield is a quick read on how fierce the AI should be for your current run. Higher roman numerals mean the bot follows stronger local-evaluator moves more often.</p>
            <div className="power-shield-guide-current">
              <span className={`power-shield-badge power-shield-tier-${tier}`} aria-hidden="true"><span className="power-shield-icon">{romanTier}</span></span>
              <div><strong>Current shield</strong><span>Level {romanTier}</span></div>
            </div>
            <ul className="power-shield-guide-list">
              {shieldGroups.map((group) => (
                <li key={group.levels}>
                  <strong>{group.levels} · {group.title}</strong>
                  <span>{group.detail}</span>
                </li>
              ))}
            </ul>
            <p className="power-shield-guide-note">Daily wins can push the shield upward; loss streaks can soften it so rematches stay playable.</p>
          </section>
        </div>
      )}
    </>
  );
}
