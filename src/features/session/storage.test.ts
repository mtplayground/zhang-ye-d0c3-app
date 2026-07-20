import { describe, expect, it, vi } from 'vitest';
import {
  SOLVE_HISTORY_STORAGE_KEY,
  appendSolveResult,
  createStoredSolveResult,
  getBestSolveResult,
  loadSolveHistory,
  saveSolveHistory,
} from './storage';

function createStorage(initialValue?: string) {
  const values = new Map<string, string>();

  if (initialValue !== undefined) {
    values.set(SOLVE_HISTORY_STORAGE_KEY, initialValue);
  }

  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    values,
  };
}

describe('solve history storage', () => {
  it('creates a stored result with a normalized completion date', () => {
    expect(
      createStoredSolveResult(
        {
          elapsedMs: 1320.5,
          moveCount: 24,
          completedAt: '2026-07-20T22:00:00.000Z',
        },
        new Date('2026-07-21T00:00:00.000Z'),
      ),
    ).toEqual({
      elapsedMs: 1320.5,
      moveCount: 24,
      completedAt: '2026-07-20T22:00:00.000Z',
    });
  });

  it('appends newest results first and keeps the history bounded', () => {
    const history = appendSolveResult(
      [
        {
          elapsedMs: 1400,
          moveCount: 25,
          completedAt: '2026-07-20T22:00:00.000Z',
        },
      ],
      {
        elapsedMs: 1200,
        moveCount: 22,
        completedAt: '2026-07-20T23:00:00.000Z',
      },
      1,
    );

    expect(history).toEqual([
      {
        elapsedMs: 1200,
        moveCount: 22,
        completedAt: '2026-07-20T23:00:00.000Z',
      },
    ]);
  });

  it('selects the best result by shortest time, then moves, then older date', () => {
    const best = getBestSolveResult([
      {
        elapsedMs: 1200,
        moveCount: 30,
        completedAt: '2026-07-20T23:00:00.000Z',
      },
      {
        elapsedMs: 1100,
        moveCount: 40,
        completedAt: '2026-07-21T00:00:00.000Z',
      },
      {
        elapsedMs: 1100,
        moveCount: 38,
        completedAt: '2026-07-21T01:00:00.000Z',
      },
      {
        elapsedMs: 1100,
        moveCount: 38,
        completedAt: '2026-07-20T21:00:00.000Z',
      },
    ]);

    expect(best).toEqual({
      elapsedMs: 1100,
      moveCount: 38,
      completedAt: '2026-07-20T21:00:00.000Z',
    });
  });

  it('loads valid localStorage history', () => {
    const storage = createStorage(
      JSON.stringify({
        version: 1,
        results: [
          {
            elapsedMs: 1300,
            moveCount: 26,
            completedAt: '2026-07-20T22:00:00.000Z',
          },
        ],
      }),
    );

    expect(loadSolveHistory(storage)).toEqual([
      {
        elapsedMs: 1300,
        moveCount: 26,
        completedAt: '2026-07-20T22:00:00.000Z',
      },
    ]);
  });

  it('returns an empty history when localStorage data is invalid', () => {
    const storage = createStorage('{not-json');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(loadSolveHistory(storage)).toEqual([]);
    expect(warn).toHaveBeenCalled();

    warn.mockRestore();
  });

  it('saves localStorage history without exposing storage errors', () => {
    const storage = createStorage();

    expect(
      saveSolveHistory(
        [
          {
            elapsedMs: 1300,
            moveCount: 26,
            completedAt: '2026-07-20T22:00:00.000Z',
          },
        ],
        storage,
      ),
    ).toBe(true);

    expect(storage.setItem).toHaveBeenCalledWith(
      SOLVE_HISTORY_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        results: [
          {
            elapsedMs: 1300,
            moveCount: 26,
            completedAt: '2026-07-20T22:00:00.000Z',
          },
        ],
      }),
    );
  });
});
