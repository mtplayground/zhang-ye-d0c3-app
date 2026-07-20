import { useCallback, useEffect, useState } from 'react';
import { Palette, RotateCcw, Shuffle } from 'lucide-react';
import {
  CubeScene,
  applyMove,
  createScrambledCube,
  createSolvedCube,
  isSolved,
  type Move,
} from './features/cube';
import {
  createIdleTimer,
  formatElapsedTime,
  getElapsedMs,
  resetTimer,
  startTimer,
  stopTimer,
} from './features/session';

type ActionButtonProps = {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
};

function ActionButton({
  icon,
  label,
  onClick,
  variant = 'secondary',
}: ActionButtonProps) {
  const variantClass =
    variant === 'primary'
      ? 'border-slate-950 bg-slate-950 text-white hover:bg-slate-800'
      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-11 min-w-28 items-center justify-center gap-2 rounded-md border px-4 text-sm font-medium shadow-sm transition ${variantClass}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function App() {
  const [cubeState, setCubeState] = useState(() => createSolvedCube());
  const [timer, setTimer] = useState(() => createIdleTimer());
  const [visibleElapsedMs, setVisibleElapsedMs] = useState(0);
  const [moveCount, setMoveCount] = useState(0);

  useEffect(() => {
    if (timer.status !== 'running') {
      setVisibleElapsedMs(timer.elapsedMs);
      return;
    }

    let animationFrameId = 0;

    const updateElapsed = () => {
      setVisibleElapsedMs(getElapsedMs(timer, performance.now()));
      animationFrameId = window.requestAnimationFrame(updateElapsed);
    };

    updateElapsed();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [timer]);

  const handleMoveCommit = useCallback((move: Move) => {
    setCubeState((currentState) => {
      const nextState = applyMove(currentState, move);

      if (isSolved(nextState)) {
        const nowMs = performance.now();

        setTimer((currentTimer) => {
          const stoppedTimer = stopTimer(currentTimer, nowMs);
          setVisibleElapsedMs(stoppedTimer.elapsedMs);
          return stoppedTimer;
        });
      }

      return nextState;
    });
    setMoveCount((currentMoveCount) => currentMoveCount + 1);
  }, []);

  const handleScramble = useCallback(() => {
    setCubeState(createScrambledCube());
    setTimer(startTimer(performance.now()));
    setVisibleElapsedMs(0);
    setMoveCount(0);
  }, []);

  const handleReset = useCallback(() => {
    setCubeState(createSolvedCube());
    setTimer(resetTimer());
    setVisibleElapsedMs(0);
    setMoveCount(0);
  }, []);

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-5 sm:px-7 lg:px-10">
        <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="text-sm font-medium text-slate-500">经典魔方练习</div>

          <section
            className="rounded-md border border-slate-200 bg-white px-5 py-3 text-center shadow-sm"
            aria-label="计时器"
            data-timer-status={timer.status}
          >
            <div className="font-mono text-3xl font-semibold tabular-nums tracking-normal text-slate-950 sm:text-4xl">
              {formatElapsedTime(visibleElapsedMs)}
            </div>
          </section>

          <div className="flex justify-end">
            <button
              type="button"
              className="inline-flex size-11 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              aria-label="切换配色主题"
              title="切换配色主题"
            >
              <Palette className="size-5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <section className="grid flex-1 place-items-center py-8 sm:py-10">
          <div className="w-full max-w-4xl">
            <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-stage">
              <div className="absolute left-5 top-5 z-10 rounded-md border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-600 shadow-sm backdrop-blur">
                经典六色 3D 魔方
              </div>
              <CubeScene state={cubeState} onMoveCommit={handleMoveCommit} />
            </div>
          </div>
        </section>

        <footer className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-5 sm:flex-row">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span>步数</span>
            <strong className="font-mono text-lg font-semibold text-slate-900">
              {moveCount}
            </strong>
            <span className="h-4 w-px bg-slate-200" aria-hidden="true" />
            <span>最佳</span>
            <strong className="font-mono text-lg font-semibold text-slate-900">
              --:--.--
            </strong>
          </div>

          <div className="flex w-full items-center justify-center gap-3 sm:w-auto">
            <ActionButton
              icon={<Shuffle className="size-4" aria-hidden="true" />}
              label="打乱"
              onClick={handleScramble}
              variant="primary"
            />
            <ActionButton
              icon={<RotateCcw className="size-4" aria-hidden="true" />}
              label="重置"
              onClick={handleReset}
            />
          </div>
        </footer>
      </div>
    </main>
  );
}

export default App;
