import { describe, expect, it } from 'vitest';
import { applyMove, createSolvedCube, isSolved, type Move } from '../cube';
import { createInitialGameSession, gameSessionReducer } from './gameSession';

const move = (
  face: Move['face'],
  direction: Move['direction'] = 'clockwise',
  amount: Move['amount'] = 1,
): Move => ({ face, direction, amount });

describe('game session reducer', () => {
  it('starts scramble timing and begins a solving session', () => {
    const scrambled = applyMove(createSolvedCube(), move('R'));
    const session = gameSessionReducer(createInitialGameSession(), {
      type: 'scramble',
      nowMs: 1000,
      cubeState: scrambled,
    });

    expect(session.timer.status).toBe('running');
    expect(session.timer.startedAtMs).toBe(1000);
    expect(session.visibleElapsedMs).toBe(0);
    expect(session.solveSession).toEqual({
      status: 'solving',
      moveCount: 0,
      result: null,
    });
    expect(isSolved(session.cubeState)).toBe(false);
  });

  it('does not count turns before a scramble starts a solving session', () => {
    const session = gameSessionReducer(createInitialGameSession(), {
      type: 'commitMove',
      move: move('R'),
      nowMs: 1200,
    });

    expect(session.solveSession.moveCount).toBe(0);
    expect(session.solveSession.status).toBe('idle');
    expect(session.timer.status).toBe('idle');
    expect(isSolved(session.cubeState)).toBe(false);
  });

  it('counts solving moves and keeps the timer running until solved', () => {
    const scrambled = applyMove(createSolvedCube(), move('R'));
    const started = gameSessionReducer(createInitialGameSession(), {
      type: 'scramble',
      nowMs: 1000,
      cubeState: scrambled,
    });
    const moved = gameSessionReducer(started, {
      type: 'commitMove',
      move: move('U'),
      nowMs: 1250,
    });

    expect(moved.solveSession.status).toBe('solving');
    expect(moved.solveSession.moveCount).toBe(1);
    expect(moved.solveSession.result).toBeNull();
    expect(moved.timer.status).toBe('running');
  });

  it('stops the timer and emits a completion result when restored', () => {
    const scrambled = applyMove(createSolvedCube(), move('R'));
    const started = gameSessionReducer(createInitialGameSession(), {
      type: 'scramble',
      nowMs: 1000,
      cubeState: scrambled,
    });
    const completed = gameSessionReducer(started, {
      type: 'commitMove',
      move: move('R', 'counterclockwise'),
      nowMs: 2475.25,
    });

    expect(isSolved(completed.cubeState)).toBe(true);
    expect(completed.timer.status).toBe('stopped');
    expect(completed.timer.elapsedMs).toBeCloseTo(1475.25);
    expect(completed.visibleElapsedMs).toBeCloseTo(1475.25);
    expect(completed.solveSession).toEqual({
      status: 'completed',
      moveCount: 1,
      result: {
        elapsedMs: 1475.25,
        moveCount: 1,
      },
    });
    expect(completed.bestResult).toEqual({
      elapsedMs: 1475.25,
      moveCount: 1,
    });
    expect(completed.lastResultComparison).toMatchObject({
      isFirstResult: true,
      isNewBest: true,
      timeDeltaMs: null,
      moveDelta: null,
    });
  });

  it('compares later completions with the previous best', () => {
    const firstScramble = applyMove(createSolvedCube(), move('R'));
    const firstStarted = gameSessionReducer(createInitialGameSession(), {
      type: 'scramble',
      nowMs: 1000,
      cubeState: firstScramble,
    });
    const firstCompleted = gameSessionReducer(firstStarted, {
      type: 'commitMove',
      move: move('R', 'counterclockwise'),
      nowMs: 2500,
    });

    const secondScramble = applyMove(createSolvedCube(), move('U'));
    const secondStarted = gameSessionReducer(firstCompleted, {
      type: 'scramble',
      nowMs: 3000,
      cubeState: secondScramble,
    });
    const secondCompleted = gameSessionReducer(secondStarted, {
      type: 'commitMove',
      move: move('U', 'counterclockwise'),
      nowMs: 4100,
    });

    expect(secondCompleted.bestResult).toEqual({
      elapsedMs: 1100,
      moveCount: 1,
    });
    expect(secondCompleted.lastResultComparison).toMatchObject({
      isFirstResult: false,
      isNewBest: true,
      timeDeltaMs: -400,
      moveDelta: 0,
    });
  });

  it('resets cube, timer, move count, and completion result', () => {
    const scrambled = applyMove(createSolvedCube(), move('R'));
    const started = gameSessionReducer(createInitialGameSession(), {
      type: 'scramble',
      nowMs: 1000,
      cubeState: scrambled,
    });
    const reset = gameSessionReducer(started, { type: 'reset' });

    expect(isSolved(reset.cubeState)).toBe(true);
    expect(reset.timer.status).toBe('idle');
    expect(reset.visibleElapsedMs).toBe(0);
    expect(reset.solveSession).toEqual({
      status: 'idle',
      moveCount: 0,
      result: null,
    });
    expect(reset.bestResult).toBeNull();
    expect(reset.lastResultComparison).toBeNull();
  });
});
