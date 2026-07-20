import { isBetterResult, type SolveResult } from './results';

export const SOLVE_HISTORY_STORAGE_KEY = 'classic-cube.solve-history.v1';
export const MAX_STORED_SOLVE_RESULTS = 100;

export type StoredSolveResult = SolveResult & {
  completedAt: string;
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

type SerializedSolveHistory = {
  version: 1;
  results: StoredSolveResult[];
};

export function createStoredSolveResult(
  result: SolveResult,
  fallbackCompletedAt = new Date(),
): StoredSolveResult {
  const completedAt = normalizeCompletedAt(
    result.completedAt,
    fallbackCompletedAt,
  );

  return {
    elapsedMs: normalizeElapsedMs(result.elapsedMs),
    moveCount: normalizeMoveCount(result.moveCount),
    completedAt,
  };
}

export function appendSolveResult(
  history: readonly StoredSolveResult[],
  result: SolveResult,
  maxResults = MAX_STORED_SOLVE_RESULTS,
): StoredSolveResult[] {
  if (!Number.isInteger(maxResults) || maxResults < 1) {
    throw new Error('Stored solve history limit must be a positive integer');
  }

  const nextHistory = [createStoredSolveResult(result), ...history].slice(
    0,
    maxResults,
  );

  return nextHistory;
}

export function getBestSolveResult(
  history: readonly StoredSolveResult[],
): StoredSolveResult | null {
  return history.reduce<StoredSolveResult | null>((bestResult, result) => {
    const normalizedResult = createStoredSolveResult(result);

    if (!bestResult) {
      return normalizedResult;
    }

    if (isBetterResult(normalizedResult, bestResult)) {
      return normalizedResult;
    }

    if (
      normalizedResult.elapsedMs === bestResult.elapsedMs &&
      normalizedResult.moveCount === bestResult.moveCount &&
      normalizedResult.completedAt < bestResult.completedAt
    ) {
      return normalizedResult;
    }

    return bestResult;
  }, null);
}

export function loadSolveHistory(
  storage: StorageLike = window.localStorage,
): StoredSolveResult[] {
  try {
    const rawValue = storage.getItem(SOLVE_HISTORY_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);

    if (!isSerializedSolveHistory(parsedValue)) {
      return [];
    }

    return parsedValue.results.map((result) => createStoredSolveResult(result));
  } catch (error) {
    console.warn('Failed to load solve history from localStorage', error);
    return [];
  }
}

export function saveSolveHistory(
  history: readonly StoredSolveResult[],
  storage: StorageLike = window.localStorage,
): boolean {
  try {
    const payload: SerializedSolveHistory = {
      version: 1,
      results: history.map((result) => createStoredSolveResult(result)),
    };

    storage.setItem(SOLVE_HISTORY_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.warn('Failed to save solve history to localStorage', error);
    return false;
  }
}

function isSerializedSolveHistory(
  value: unknown,
): value is SerializedSolveHistory {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<SerializedSolveHistory>;

  return (
    candidate.version === 1 &&
    Array.isArray(candidate.results) &&
    candidate.results.every(isStoredSolveResultLike)
  );
}

function isStoredSolveResultLike(value: unknown): value is StoredSolveResult {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<StoredSolveResult>;

  return (
    typeof candidate.elapsedMs === 'number' &&
    typeof candidate.moveCount === 'number' &&
    typeof candidate.completedAt === 'string'
  );
}

function normalizeElapsedMs(elapsedMs: number): number {
  if (!Number.isFinite(elapsedMs)) {
    throw new Error('Stored result elapsed time must be a finite number');
  }

  return Math.max(0, elapsedMs);
}

function normalizeMoveCount(moveCount: number): number {
  if (!Number.isInteger(moveCount) || moveCount < 0) {
    throw new Error('Stored result move count must be a non-negative integer');
  }

  return moveCount;
}

function normalizeCompletedAt(
  completedAt: string | undefined,
  fallbackCompletedAt: Date,
): string {
  const date = completedAt ? new Date(completedAt) : fallbackCompletedAt;

  if (!Number.isFinite(date.getTime())) {
    return fallbackCompletedAt.toISOString();
  }

  return date.toISOString();
}
