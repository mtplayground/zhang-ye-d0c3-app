export type SolveSessionStatus = 'idle' | 'solving' | 'completed';

export type CompletionResult = {
  elapsedMs: number;
  moveCount: number;
};

export type SolveSessionState = {
  status: SolveSessionStatus;
  moveCount: number;
  result: CompletionResult | null;
};

export type MoveCommitResult = {
  isSolved: boolean;
  elapsedMs: number;
};

export function createIdleSolveSession(): SolveSessionState {
  return {
    status: 'idle',
    moveCount: 0,
    result: null,
  };
}

export function startSolveSession(): SolveSessionState {
  return {
    status: 'solving',
    moveCount: 0,
    result: null,
  };
}

export function resetSolveSession(): SolveSessionState {
  return createIdleSolveSession();
}

export function recordEffectiveMove(
  session: SolveSessionState,
  commit: MoveCommitResult,
): SolveSessionState {
  if (session.status !== 'solving') {
    return session;
  }

  const moveCount = session.moveCount + 1;

  if (!commit.isSolved) {
    return {
      ...session,
      moveCount,
    };
  }

  const elapsedMs = normalizeElapsedMs(commit.elapsedMs);

  return {
    status: 'completed',
    moveCount,
    result: {
      elapsedMs,
      moveCount,
    },
  };
}

function normalizeElapsedMs(elapsedMs: number): number {
  if (!Number.isFinite(elapsedMs)) {
    throw new Error('Completion elapsed time must be a finite number');
  }

  return Math.max(0, elapsedMs);
}
