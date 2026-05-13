type ResultShareCardProps = {
  result: string;
  playerName: string;
  score: number;
  moves: number;
  seedSlug: string;
  backRankCode: string;
  taunt: string;
  comparisonText?: string;
};

export function ResultShareCard({ result, playerName, score, moves, seedSlug, backRankCode, taunt, comparisonText }: ResultShareCardProps) {
  return (
    <section className="result-share-card" aria-label="Share preview card">
      <p className="eyebrow">Pocket Shuffle Chess</p>
      <h3>{playerName} scored {score}</h3>
      <div className="share-card-grid">
        <span>Result <strong>{result}</strong></span>
        <span>Seed <strong>{seedSlug}</strong></span>
        <span>Moves <strong>{moves}</strong></span>
        <span>Setup <strong>{backRankCode}</strong></span>
      </div>
      <blockquote>“{taunt}”</blockquote>
      {comparisonText && <p className="share-card-comparison">{comparisonText}</p>}
      <strong className="share-card-cta">Can you beat this?</strong>
    </section>
  );
}
