import { RotateCcw, X } from 'lucide-react';
import type { ResultComparison } from './results';
import { formatElapsedTime } from './timer';

type ResultDialogProps = {
  comparison: ResultComparison;
  onClose: () => void;
  onPlayAgain: () => void;
};

export function ResultDialog({
  comparison,
  onClose,
  onPlayAgain,
}: ResultDialogProps) {
  const headline = resultHeadline(comparison);
  const comparisonText = resultComparisonText(comparison);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm"
      role="presentation"
    >
      <section
        className="relative w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 text-slate-950 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-dialog-title"
      >
        <button
          type="button"
          className="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          aria-label="关闭结果"
          title="关闭结果"
          onClick={onClose}
        >
          <X className="size-5" aria-hidden="true" />
        </button>

        <div className="space-y-1 pr-10">
          <p className="text-sm font-medium text-emerald-700">还原完成</p>
          <h2
            id="result-dialog-title"
            className="text-2xl font-semibold tracking-normal"
          >
            {headline}
          </h2>
          <p className="text-sm leading-6 text-slate-600">{comparisonText}</p>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3">
          <ResultMetric
            label="本局用时"
            value={formatElapsedTime(comparison.result.elapsedMs)}
          />
          <ResultMetric
            label="本局步数"
            value={`${comparison.result.moveCount}`}
          />
          <ResultMetric
            label="当前最佳"
            value={formatElapsedTime(comparison.bestResult.elapsedMs)}
          />
          <ResultMetric
            label="最佳步数"
            value={`${comparison.bestResult.moveCount}`}
          />
        </dl>

        <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {bestDeltaText(comparison)}
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            onClick={onClose}
          >
            留在本局
          </button>
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-950 bg-slate-950 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
            onClick={onPlayAgain}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            <span>再来一局</span>
          </button>
        </div>
      </section>
    </div>
  );
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 px-3 py-3">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-950">
        {value}
      </dd>
    </div>
  );
}

function resultHeadline(comparison: ResultComparison): string {
  if (comparison.isFirstResult) {
    return '首个成绩已记录';
  }

  if (comparison.isNewBest) {
    return '刷新最佳成绩';
  }

  return '本局已完成';
}

function resultComparisonText(comparison: ResultComparison): string {
  if (comparison.isFirstResult) {
    return '这是你的第一局完整成绩，后续成绩会和它进行对比。';
  }

  if (comparison.isNewBest) {
    return `比此前最佳快 ${formatElapsedTime(Math.abs(comparison.timeDeltaMs ?? 0))}。`;
  }

  return `距离最佳还差 ${formatElapsedTime(Math.max(0, comparison.timeDeltaMs ?? 0))}。`;
}

function bestDeltaText(comparison: ResultComparison): string {
  if (comparison.isFirstResult) {
    return '新的最佳基准已经建立。';
  }

  const moveDelta = comparison.moveDelta ?? 0;
  const moveText =
    moveDelta === 0
      ? '步数与最佳持平'
      : moveDelta > 0
        ? `比最佳多 ${moveDelta} 步`
        : `比最佳少 ${Math.abs(moveDelta)} 步`;

  if (comparison.isNewBest) {
    return `${moveText}，但用时更快，成绩已刷新。`;
  }

  return `${moveText}，继续压缩转动和观察时间。`;
}
