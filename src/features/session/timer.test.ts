import { describe, expect, it } from 'vitest';
import {
  createIdleTimer,
  formatElapsedTime,
  getElapsedMs,
  resetTimer,
  startTimer,
  stopTimer,
} from './timer';

describe('timer state', () => {
  it('starts from an idle zero state', () => {
    expect(createIdleTimer()).toEqual({
      status: 'idle',
      startedAtMs: null,
      elapsedMs: 0,
    });
  });

  it('tracks running elapsed time from the supplied high precision timestamp', () => {
    const timer = startTimer(1234.5);

    expect(timer).toEqual({
      status: 'running',
      startedAtMs: 1234.5,
      elapsedMs: 0,
    });
    expect(getElapsedMs(timer, 1296.75)).toBeCloseTo(62.25);
  });

  it('stops a running timer and freezes the elapsed value', () => {
    const stopped = stopTimer(startTimer(1000), 2456.78);

    expect(stopped.status).toBe('stopped');
    expect(stopped.elapsedMs).toBeCloseTo(1456.78);
    expect(getElapsedMs(stopped, 4000)).toBeCloseTo(1456.78);
  });

  it('leaves idle and already stopped timers unchanged when stopped', () => {
    const idle = createIdleTimer();
    const stopped = stopTimer(startTimer(10), 90);

    expect(stopTimer(idle, 100)).toBe(idle);
    expect(stopTimer(stopped, 200)).toBe(stopped);
  });

  it('resets the timer to zero', () => {
    expect(resetTimer()).toEqual(createIdleTimer());
  });

  it('formats elapsed time as minutes, seconds, and centiseconds', () => {
    expect(formatElapsedTime(0)).toBe('00:00.00');
    expect(formatElapsedTime(1234)).toBe('00:01.23');
    expect(formatElapsedTime(61_009)).toBe('01:01.00');
    expect(formatElapsedTime(-50)).toBe('00:00.00');
  });
});
