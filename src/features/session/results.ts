import type { CompletionResult } from './solveSession';

export type SolveResult = CompletionResult & {
  completedAt?: string;
};

export type ResultComparison = {
  result: SolveResult;
  previousBest: SolveResult | null;
  bestResult: SolveResult;
  isFirstResult: boolean;
  isNewBest: boolean;
  timeDeltaMs: number | null;
  moveDelta: number | null;
};

export function compareResultWithBest(
  result: SolveResult,
  previousBest: SolveResult | null,
): ResultComparison {
  const normalizedResult = normalizeResult(result);
  const normalizedPreviousBest = previousBest
    ? normalizeResult(previousBest)
    : null;
  const isFirstResult = normalizedPreviousBest === null;
  const isNewBest =
    isFirstResult || isBetterResult(normalizedResult, normalizedPreviousBest);
  const bestResult = isNewBest ? normalizedResult : normalizedPreviousBest;

  return {
    result: normalizedResult,
    previousBest: normalizedPreviousBest,
    bestResult,
    isFirstResult,
    isNewBest,
    timeDeltaMs: normalizedPreviousBest
      ? normalizedResult.elapsedMs - normalizedPreviousBest.elapsedMs
      : null,
    moveDelta: normalizedPreviousBest
      ? normalizedResult.moveCount - normalizedPreviousBest.moveCount
      : null,
  };
}

export function isBetterResult(
  result: SolveResult,
  bestResult: SolveResult,
): boolean {
  const normalizedResult = normalizeResult(result);
  const normalizedBest = normalizeResult(bestResult);

  if (normalizedResult.elapsedMs !== normalizedBest.elapsedMs) {
    return normalizedResult.elapsedMs < normalizedBest.elapsedMs;
  }

  return normalizedResult.moveCount < normalizedBest.moveCount;
}

function normalizeResult(result: SolveResult): SolveResult {
  if (!Number.isFinite(result.elapsedMs)) {
    throw new Error('Result elapsed time must be a finite number');
  }

  if (!Number.isInteger(result.moveCount) || result.moveCount < 0) {
    throw new Error('Result move count must be a non-negative integer');
  }

  return {
    elapsedMs: Math.max(0, result.elapsedMs),
    moveCount: result.moveCount,
    ...(result.completedAt ? { completedAt: result.completedAt } : {}),
  };
}
