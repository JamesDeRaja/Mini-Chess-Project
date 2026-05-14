import { getPowerRomanNumeral, type PlayerPowerTier } from '../game/playerPower.js';

type Props = {
  tier: PlayerPowerTier;
  label?: string;
};

export function PowerShieldBadge({ tier, label = 'Player power' }: Props) {
  return (
    <span className={`power-shield-badge power-shield-tier-${tier}`} aria-label={`${label} level ${getPowerRomanNumeral(tier)}. AI best-move chance ${tier * 10} percent.`} title={`Power ${getPowerRomanNumeral(tier)} · AI best-move chance ${tier * 10}%`}>
      <span className="power-shield-icon" aria-hidden="true">{getPowerRomanNumeral(tier)}</span>
      <span className="power-shield-copy" aria-hidden="true">{tier * 10}%</span>
    </span>
  );
}
