'use client';

import { motion } from 'framer-motion';
import { FileItem } from '@/types/file';
import { formatSize } from '@/lib/format-size';
import { ProgressBar } from './progress-bar';

interface FileCardProps {
  item: FileItem;
  targetMB: number | null;
  onRemove: (id: string) => void;
  onDownload: (id: string) => void;
}

const statusConfig = {
  idle: { dot: 'bg-slate-300', label: 'Ready', labelClass: 'text-slate-400' },
  compressing: { dot: 'bg-blue-500 animate-pulse', label: 'Compressing…', labelClass: 'text-blue-500' },
  done: { dot: 'bg-green-500', label: 'Done', labelClass: 'text-green-600' },
  error: { dot: 'bg-red-500', label: 'Error', labelClass: 'text-red-500' },
};

export function FileCard({ item, targetMB, onRemove, onDownload }: FileCardProps) {
  const { uploadedFile: f, status, result, errorMessage, progress } = item;
  const cfg = statusConfig[status];
  const isPDF = f.mimeType === 'application/pdf';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      {/* Main row */}
      <div className="flex items-center gap-3 p-3">
        {/* Thumbnail */}
        <div className="shrink-0">
          {f.previewUrl ? (
            <img
              src={f.previewUrl}
              alt="preview"
              className="h-14 w-14 rounded-lg border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-red-50 to-red-100 text-2xl">
              📄
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-slate-800">{f.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] text-slate-400">{f.sizeFormatted}</span>
            {result && (
              <>
                <span className="text-slate-300">→</span>
                <span className="font-mono text-[11px] font-bold text-green-600">
                  {formatSize(result.compressedSize)}
                </span>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-600">
                  −{result.reductionPercent.toFixed(1)}%
                </span>
              </>
            )}
          </div>
          {/* Status row */}
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
            <span className={`text-[11px] font-semibold ${cfg.labelClass}`}>{cfg.label}</span>
            {errorMessage && (
              <span className="text-[11px] text-red-400">— {errorMessage}</span>
            )}
            {result && (
              <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                result.isWithinTarget
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {result.isWithinTarget ? '✅ Within target' : '⚠ Above target'}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          {status === 'done' && result && (
            <button
              type="button"
              onClick={() => onDownload(item.id)}
              className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-[12px] font-bold text-white transition hover:bg-green-700"
            >
              ⬇
            </button>
          )}
          {status !== 'compressing' && (
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-red-300 hover:bg-red-50 hover:text-red-500"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Progress bar — only while compressing */}
      {status === 'compressing' && (
        <div className="border-t border-slate-100 px-3 pb-3 pt-2">
          <ProgressBar progress={progress} compact />
        </div>
      )}

      {/* Result preview — only when done and is image */}
      {status === 'done' && result?.previewUrl && !isPDF && (
        <div className="border-t border-slate-100 bg-slate-50 p-3">
          <div className="flex items-center gap-3">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200">
              <img src={result.previewUrl} alt="compressed" className="h-full w-full object-cover" />
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/60 px-1.5 py-0.5 font-mono text-[9px] text-white">
                {formatSize(result.compressedSize)}
              </span>
            </div>
            <div className="flex-1">
              <div className="mb-1.5 flex justify-between text-[10px] font-semibold text-slate-400">
                <span>Size reduction</span>
                <span>{f.sizeFormatted} → {formatSize(result.compressedSize)}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400"
                  initial={{ width: '100%' }}
                  animate={{ width: `${100 - result.reductionPercent}%` }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
