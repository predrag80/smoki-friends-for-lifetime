/** A scene scoring this or lower against the portrait is generated once more (same job, no extra user limit). */
export const PORTRAIT_LIKENESS_RETRY_AT = 4;

/** True when the scene should be generated again: the strict portrait score is a clear miss. */
export function needsAnotherCandidate(score: number | null): boolean {
  return score !== null && score <= PORTRAIT_LIKENESS_RETRY_AT;
}

/** Lowest likeness over everyone in a group photo (null when the judge could not answer for anyone). */
export function weakestScore(scores: (number | null)[]): number | null {
  const known = scores.filter((score): score is number => score !== null);
  return known.length > 0 ? Math.min(...known) : null;
}
