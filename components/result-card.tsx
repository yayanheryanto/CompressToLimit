'use client';

import { motion } from 'framer-motion';
import { CompressionResult } from '@/types/file';
import { formatSize } from '@/lib/format-size';

interface ResultCardProps {
  result: CompressionResult;
  onDownload: () => void;
  onRecompress: () => void;
}

export function ResultCard({ result, onDownload, onRecompress }: ResultCardProps) {
  const isPDF = result.blob.type === 'application/pdf';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      {/* Status badge */}
      <div className="mb-5">
        {result.isWithinTarget ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
            ✅ Ready for upload
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-4 py-2 text-sm font-semibold text-yellow-700">
            ⚠ Slightly above target
          </span>
        )}
      </div>

      {/* Preview + stats side by side */}
      <div className="mb-5 flex flex-col gap-5 sm:flex-row sm:items-start">
        {/* Preview panel */}
        <div className="shrink-0">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Preview</p>
          {isPDF ? (
            <div className="flex h-[140px] w-[140px] items-center justify-center rounded-xl border border-slate-200 bg-gradient-to-br from-red-50 to-red-100 text-5xl shadow-inner">
              📄
            </div>
          ) : result.previewUrl ? (
            <div className="relative h-[140px] w-[140px] overflow-hidden rounded-xl border border-slate-200 shadow-inner">
              <img
                src={result.previewUrl}
                alt="Compressed preview"
                className="h-full w-full object-cover"
              />
              {/* Compressed label */}
              <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/60 px-2 py-0.5 font-mono text-[10px] text-white backdrop-blur-sm">
                {formatSize(result.compressedSize)}
              </span>
            </div>
          ) : null}
        </div>

        {/* Stats */}
        <div className="flex flex-1 flex-col gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Stats</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Original', value: formatSize(result.originalSize), color: 'text-slate-700' },
              { label: 'Compressed', value: formatSize(result.compressedSize), color: 'text-green-600' },
              { label: 'Reduction', value: `−${result.reductionPercent.toFixed(1)}%`, color: 'text-blue-600' },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-center"
              >
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {label}
                </div>
                <div className={`font-mono text-lg font-bold ${color}`}>{value}</div>
              </div>
            ))}
          </div>

          {/* Bar comparison */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="mb-2 flex justify-between text-[11px] font-semibold text-slate-400">
              <span>Size comparison</span>
              <span>{formatSize(result.originalSize)} → {formatSize(result.compressedSize)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400"
                initial={{ width: '100%' }}
                animate={{ width: `${100 - result.reductionPercent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onDownload}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-[14px] font-bold text-white transition hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-lg"
        >
          ⬇ Download File
        </button>
        <button
          type="button"
          onClick={onRecompress}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-[14px] font-semibold text-slate-600 transition hover:border-blue-400 hover:text-blue-600"
        >
          🔄 Re-compress
        </button>
      </div>
    </motion.div>
  );
}
