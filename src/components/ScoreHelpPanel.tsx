import type { ScoreBreakdown } from '../game/scoring.js';

type ScoreHelpPanelProps = {
  breakdown: ScoreBreakdown;
  onClose: () => void;
};

function signed(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

export function ScoreHelpPanel({ breakdown, onClose }: ScoreHelpPanelProps) {
  const captureTip = breakdown.capturePoints >= 0
    ? 'Keep taking valuable pieces while protecting yours.'
    : 'Trade more carefully: enemy captures are reducing your capture score.';
  const speedTip = breakdown.speedBonus > 0
    ? 'You earned a speed bonus. Faster checkmates add more points.'
    : 'Look for forcing checks, pins, and direct king attacks to finish faster.';
  const handicapTip = breakdown.handicapBonus > 0
    ? 'Ascension bonus is added because you started without pieces.'
    : 'No ascension handicap bonus was active this game.';

  return (
    <div className="score-help-panel" role="dialog" aria-modal="false" aria-labelledby="score-help-title">
      <div className="score-help-header">
        <div>
          <p className="eyebrow">Score guide</p>
          <h3 id="score-help-title">How this score was built</h3>
        </div>
        <button type="button" className="score-help-close" onClick={onClose} aria-label="Close score explanation">×</button>
      </div>
      <div className="score-help-list">
        <p><span>Result</span><strong>{signed(breakdown.resultBonus)}</strong><small>Win by checkmate gives the main bonus. Stalemate gives a smaller survival bonus.</small></p>
        <p><span>Speed</span><strong>{signed(breakdown.speedBonus)}</strong><small>{speedTip}</small></p>
        <p><span>Captures</span><strong>{signed(breakdown.capturePoints)}</strong><small>{captureTip}</small></p>
        <p><span>Missing-piece bonus</span><strong>{signed(breakdown.handicapBonus)}</strong><small>{handicapTip}</small></p>
        <p><span>Moves</span><strong>{breakdown.fullMoves}</strong><small>Lower move counts improve speed scoring.</small></p>
        <p className="score-help-total"><span>Total</span><strong>{breakdown.totalScore}</strong><small>Improve by mating faster, winning, capturing higher-value pieces, and avoiding bad trades.</small></p>
      </div>
    </div>
  );
}
