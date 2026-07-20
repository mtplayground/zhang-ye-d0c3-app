import {
  applyMove,
  createScrambledCube,
  createSolvedCube,
  isSolved,
  type CubeState,
  type Move,
} from '../cube';
import {
  createIdleTimer,
  getElapsedMs,
  resetTimer,
  startTimer,
  stopTimer,
  type TimerState,
} from './timer';
import {
  createIdleSolveSession,
  recordEffectiveMove,
  resetSolveSession,
  startSolveSession,
  type SolveSessionState,
} from './solveSession';
import {
  compareResultWithBest,
  type ResultComparison,
  type SolveResult,
} from './results';

export type GameSessionState = {
  cubeState: CubeState;
  timer: TimerState;
  visibleElapsedMs: number;
  solveSession: SolveSessionState;
  bestResult: SolveResult | null;
  lastResultComparison: ResultComparison | null;
};

export type GameSessionAction =
  | { type: 'scramble'; nowMs: number; cubeState?: CubeState }
  | { type: 'reset' }
  | { type: 'tick'; nowMs: number }
  | { type: 'hydrateBest'; bestResult: SolveResult | null }
  | { type: 'commitMove'; move: Move; nowMs: number; completedAt?: string };

export function createInitialGameSession(): GameSessionState {
  return {
    cubeState: createSolvedCube(),
    timer: createIdleTimer(),
    visibleElapsedMs: 0,
    solveSession: createIdleSolveSession(),
    bestResult: null,
    lastResultComparison: null,
  };
}

export function gameSessionReducer(
  state: GameSessionState,
  action: GameSessionAction,
): GameSessionState {
  if (action.type === 'scramble') {
    return {
      cubeState: action.cubeState ?? createScrambledCube(),
      timer: startTimer(action.nowMs),
      visibleElapsedMs: 0,
      solveSession: startSolveSession(),
      bestResult: state.bestResult,
      lastResultComparison: null,
    };
  }

  if (action.type === 'reset') {
    return {
      cubeState: createSolvedCube(),
      timer: resetTimer(),
      visibleElapsedMs: 0,
      solveSession: resetSolveSession(),
      bestResult: state.bestResult,
      lastResultComparison: null,
    };
  }

  if (action.type === 'tick') {
    return {
      ...state,
      visibleElapsedMs: getElapsedMs(state.timer, action.nowMs),
    };
  }

  if (action.type === 'hydrateBest') {
    return {
      ...state,
      bestResult: action.bestResult,
    };
  }

  const nextCubeState = applyMove(state.cubeState, action.move);
  const solvedAfterMove = isSolved(nextCubeState);
  const timer =
    state.solveSession.status === 'solving' && solvedAfterMove
      ? stopTimer(state.timer, action.nowMs)
      : state.timer;
  const completionElapsedMs =
    timer.status === 'stopped'
      ? timer.elapsedMs
      : getElapsedMs(timer, action.nowMs);
  const solveSession = recordEffectiveMove(state.solveSession, {
    isSolved: solvedAfterMove,
    elapsedMs: completionElapsedMs,
  });
  const completedResult: SolveResult | null =
    state.solveSession.result === null && solveSession.result
      ? {
          ...solveSession.result,
          ...(action.completedAt ? { completedAt: action.completedAt } : {}),
        }
      : null;
  const resultComparison = completedResult
    ? compareResultWithBest(completedResult, state.bestResult)
    : state.lastResultComparison;

  return {
    cubeState: nextCubeState,
    timer,
    visibleElapsedMs:
      timer.status === 'running' ? state.visibleElapsedMs : timer.elapsedMs,
    solveSession,
    bestResult: resultComparison?.bestResult ?? state.bestResult,
    lastResultComparison: resultComparison,
  };
}
