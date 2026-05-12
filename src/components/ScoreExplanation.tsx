import { useState } from 'react';
import type { ScoreBreakdown } from '../game/scoring.js';

type ScoreExplanationProps = {
  breakdown: ScoreBreakdown;
  resultLabel: string;
};

function signed(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}

export function ScoreExplanation({ breakdown, resultLabel }: ScoreExplanationProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="score-help-shell">
      <button type="button" className="score-help-button" onClick={() => setIsOpen((current) => !current)} aria-expanded={isOpen} aria-label="Explain this score">?</button>
      {isOpen && (
        <aside className="score-help-inline-panel" role="region" aria-labelledby="score-help-title">
          <button type="button" className="score-help-close" onClick={() => setIsOpen(false)} aria-label="Close score explanation">×</button>
          <p className="eyebrow">Score Details</p>
          <h3 id="score-help-title">How this score was calculated</h3>
          <div className="score-help-lines">
            <p><span>Result ({resultLabel})</span><strong>{signed(breakdown.resultBonus)}</strong></p>
            <p><span>Speed ({breakdown.fullMoves} full moves)</span><strong>{signed(breakdown.speedBonus)}</strong></p>
            <p><span>Your capture total after penalties</span><strong>{signed(breakdown.capturePoints)}</strong></p>
            <p><span>Opponent capture penalty included</span><strong>-{breakdown.capturePenalty}</strong></p>
            <p><span>Missing-piece fairness bonus</span><strong>{signed(breakdown.materialAdjustment)}</strong></p>
            <p className="score-help-total"><span>Total</span><strong>{breakdown.totalScore}</strong></p>
          </div>
          <section>
            <h4>Capture details</h4>
            {breakdown.captures.length > 0 ? (
              <ul>
                {breakdown.captures.map((capture) => (
                  <li key={`${capture.moveNumber}-${capture.capturedColor}-${capture.capturedPiece}`}>
                    Move {capture.moveNumber}: captured {capture.capturedColor} {capture.capturedPiece} for +{capture.scoreValue}.
                  </li>
                ))}
              </ul>
            ) : (
              <p>No scored captures were made by your side.</p>
            )}
          </section>
          <section>
            <h4>How to improve</h4>
            <ul>
              {breakdown.recommendations.map((recommendation) => <li key={recommendation}>{recommendation}</li>)}
            </ul>
          </section>
        </aside>
      )}
    </div>
  );
}
