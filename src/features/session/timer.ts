export type TimerStatus = 'idle' | 'running' | 'stopped';

export type TimerState = {
  status: TimerStatus;
  startedAtMs: number | null;
  elapsedMs: number;
};

export function createIdleTimer(): TimerState {
  return {
    status: 'idle',
    startedAtMs: null,
    elapsedMs: 0,
  };
}

export function startTimer(nowMs: number): TimerState {
  assertFiniteTime(nowMs);

  return {
    status: 'running',
    startedAtMs: nowMs,
    elapsedMs: 0,
  };
}

export function resetTimer(): TimerState {
  return createIdleTimer();
}

export function stopTimer(timer: TimerState, nowMs: number): TimerState {
  assertFiniteTime(nowMs);

  if (timer.status !== 'running' || timer.startedAtMs === null) {
    return timer;
  }

  return {
    status: 'stopped',
    startedAtMs: timer.startedAtMs,
    elapsedMs: getElapsedMs(timer, nowMs),
  };
}

export function getElapsedMs(timer: TimerState, nowMs: number): number {
  assertFiniteTime(nowMs);

  if (timer.status !== 'running' || timer.startedAtMs === null) {
    return timer.elapsedMs;
  }

  return Math.max(0, nowMs - timer.startedAtMs);
}

export function formatElapsedTime(milliseconds: number): string {
  const safeMilliseconds = Math.max(0, milliseconds);
  const totalCentiseconds = Math.floor(safeMilliseconds / 10);
  const minutes = Math.floor(totalCentiseconds / 6000);
  const seconds = Math.floor((totalCentiseconds % 6000) / 100);
  const centiseconds = totalCentiseconds % 100;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}

function assertFiniteTime(nowMs: number) {
  if (!Number.isFinite(nowMs)) {
    throw new Error('Timer time source must return a finite number');
  }
}
