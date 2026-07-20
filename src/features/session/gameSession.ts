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

export type GameSessionState = {
  cubeState: CubeState;
  timer: TimerState;
  visibleElapsedMs: number;
  solveSession: SolveSessionState;
};

export type GameSessionAction =
  | { type: 'scramble'; nowMs: number; cubeState?: CubeState }
  | { type: 'reset' }
  | { type: 'tick'; nowMs: number }
  | { type: 'commitMove'; move: Move; nowMs: number };

export function createInitialGameSession(): GameSessionState {
  return {
    cubeState: createSolvedCube(),
    timer: createIdleTimer(),
    visibleElapsedMs: 0,
    solveSession: createIdleSolveSession(),
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
    };
  }

  if (action.type === 'reset') {
    return {
      cubeState: createSolvedCube(),
      timer: resetTimer(),
      visibleElapsedMs: 0,
      solveSession: resetSolveSession(),
    };
  }

  if (action.type === 'tick') {
    return {
      ...state,
      visibleElapsedMs: getElapsedMs(state.timer, action.nowMs),
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

  return {
    cubeState: nextCubeState,
    timer,
    visibleElapsedMs:
      timer.status === 'running' ? state.visibleElapsedMs : timer.elapsedMs,
    solveSession: recordEffectiveMove(state.solveSession, {
      isSolved: solvedAfterMove,
      elapsedMs: completionElapsedMs,
    }),
  };
}
