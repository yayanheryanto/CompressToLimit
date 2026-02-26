'use client';

import { motion } from 'framer-motion';
import { ProgressState } from '@/types/file';

interface ProgressBarProps {
  progress: ProgressState;
  compact?: boolean;
}

export function ProgressBar({ progress, compact = false }: ProgressBarProps) {
  if (compact) {
    return (
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 italic truncate">{progress.step}</span>
          <span className="ml-2 shrink-0 font-mono text-[11px] font-bold text-blue-600">
            {Math.round(progress.percent)}%
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-violet-600"
            initial={{ width: '0%' }}
            animate={{ width: `${progress.percent}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-xl border border-slate-200 bg-slate-50 p-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-600">{progress.label}</span>
        <span className="font-mono text-sm font-bold text-blue-600">
          {Math.round(progress.percent)}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-violet-600"
          initial={{ width: '0%' }}
          animate={{ width: `${progress.percent}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
      <p className="mt-2 text-xs italic text-slate-400">{progress.step}</p>
    </motion.div>
  );
}
