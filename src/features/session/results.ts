import type { CompletionResult } from './solveSession';

export type ResultComparison = {
  result: CompletionResult;
  previousBest: CompletionResult | null;
  bestResult: CompletionResult;
  isFirstResult: boolean;
  isNewBest: boolean;
  timeDeltaMs: number | null;
  moveDelta: number | null;
};

export function compareResultWithBest(
  result: CompletionResult,
  previousBest: CompletionResult | null,
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
  result: CompletionResult,
  bestResult: CompletionResult,
): boolean {
  const normalizedResult = normalizeResult(result);
  const normalizedBest = normalizeResult(bestResult);

  if (normalizedResult.elapsedMs !== normalizedBest.elapsedMs) {
    return normalizedResult.elapsedMs < normalizedBest.elapsedMs;
  }

  return normalizedResult.moveCount < normalizedBest.moveCount;
}

function normalizeResult(result: CompletionResult): CompletionResult {
  if (!Number.isFinite(result.elapsedMs)) {
    throw new Error('Result elapsed time must be a finite number');
  }

  if (!Number.isInteger(result.moveCount) || result.moveCount < 0) {
    throw new Error('Result move count must be a non-negative integer');
  }

  return {
    elapsedMs: Math.max(0, result.elapsedMs),
    moveCount: result.moveCount,
  };
}
