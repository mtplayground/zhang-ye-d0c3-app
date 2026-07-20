import { describe, expect, it } from 'vitest';
import {
  createIdleSolveSession,
  recordEffectiveMove,
  resetSolveSession,
  startSolveSession,
} from './solveSession';

describe('solve session move counting', () => {
  it('starts idle with no moves and no result', () => {
    expect(createIdleSolveSession()).toEqual({
      status: 'idle',
      moveCount: 0,
      result: null,
    });
  });

  it('starts a solving session with a zero move counter', () => {
    expect(startSolveSession()).toEqual({
      status: 'solving',
      moveCount: 0,
      result: null,
    });
  });

  it('counts effective moves only while solving', () => {
    const idle = createIdleSolveSession();
    const firstMove = recordEffectiveMove(startSolveSession(), {
      isSolved: false,
      elapsedMs: 120,
    });

    expect(recordEffectiveMove(idle, { isSolved: false, elapsedMs: 120 })).toBe(
      idle,
    );
    expect(firstMove).toEqual({
      status: 'solving',
      moveCount: 1,
      result: null,
    });
  });

  it('completes with elapsed time and final move count when solved', () => {
    const afterOneMove = recordEffectiveMove(startSolveSession(), {
      isSolved: false,
      elapsedMs: 500,
    });
    const completed = recordEffectiveMove(afterOneMove, {
      isSolved: true,
      elapsedMs: 1420.8,
    });

    expect(completed).toEqual({
      status: 'completed',
      moveCount: 2,
      result: {
        elapsedMs: 1420.8,
        moveCount: 2,
      },
    });
    expect(
      recordEffectiveMove(completed, { isSolved: false, elapsedMs: 1600 }),
    ).toBe(completed);
  });

  it('resets to the idle state', () => {
    expect(resetSolveSession()).toEqual(createIdleSolveSession());
  });
});
