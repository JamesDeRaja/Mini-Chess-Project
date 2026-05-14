import type { MoveAnalysis } from '../game/types.js';
import { BestMoveArrow } from './BestMoveArrow.js';
import { MoveQualityBadge } from './MoveQualityBadge.js';

type AnalysisOverlayProps = {
  analysis: MoveAnalysis | null;
  actualTo: number | null;
  isFlipped?: boolean;
};

export function AnalysisOverlay({ analysis, actualTo, isFlipped = false }: AnalysisOverlayProps) {
  if (!analysis) return null;
  const orientation = isFlipped ? 'black' : 'white';

  return (
    <div className="analysis-overlay" aria-hidden="true">
      <div className="analysis-overlay-content">
        {analysis.isBlunder && actualTo !== null && <MoveQualityBadge square={analysis.blunderSquare ?? actualTo} orientation={orientation} variant="blunder" label="Blunder" />}
        {analysis.isBestMove && actualTo !== null ? (
          <MoveQualityBadge square={actualTo} orientation={orientation} />
        ) : analysis.bestMove ? (
          <BestMoveArrow move={analysis.bestMove} orientation={orientation} />
        ) : null}
      </div>
    </div>
  );
}
