/** A scene scoring this or lower against the portrait is generated once more (same job, no extra user limit). */
export const PORTRAIT_LIKENESS_RETRY_AT = 4;

/** True when the scene should be generated again: the strict portrait score is a clear miss. */
export function needsAnotherCandidate(score: number | null): boolean {
  return score !== null && score <= PORTRAIT_LIKENESS_RETRY_AT;
}
