import { describe, expect, it } from 'vitest';
import { compareResultWithBest, isBetterResult } from './results';

describe('result comparison', () => {
  it('records the first completed result as the best', () => {
    const result = { elapsedMs: 12_340, moveCount: 42 };

    expect(compareResultWithBest(result, null)).toEqual({
      result,
      previousBest: null,
      bestResult: result,
      isFirstResult: true,
      isNewBest: true,
      timeDeltaMs: null,
      moveDelta: null,
    });
  });

  it('detects a faster result as a new best', () => {
    const comparison = compareResultWithBest(
      { elapsedMs: 9_500, moveCount: 38 },
      { elapsedMs: 10_000, moveCount: 35 },
    );

    expect(comparison.isFirstResult).toBe(false);
    expect(comparison.isNewBest).toBe(true);
    expect(comparison.bestResult).toEqual({ elapsedMs: 9_500, moveCount: 38 });
    expect(comparison.timeDeltaMs).toBe(-500);
    expect(comparison.moveDelta).toBe(3);
  });

  it('keeps the old best when the result is slower', () => {
    const previousBest = { elapsedMs: 8_900, moveCount: 34 };
    const comparison = compareResultWithBest(
      { elapsedMs: 9_300, moveCount: 31 },
      previousBest,
    );

    expect(comparison.isNewBest).toBe(false);
    expect(comparison.bestResult).toEqual(previousBest);
    expect(comparison.timeDeltaMs).toBe(400);
    expect(comparison.moveDelta).toBe(-3);
  });

  it('uses move count as the tie breaker for equal times', () => {
    expect(
      isBetterResult(
        { elapsedMs: 8_900, moveCount: 33 },
        { elapsedMs: 8_900, moveCount: 34 },
      ),
    ).toBe(true);
    expect(
      isBetterResult(
        { elapsedMs: 8_900, moveCount: 35 },
        { elapsedMs: 8_900, moveCount: 34 },
      ),
    ).toBe(false);
  });
});
