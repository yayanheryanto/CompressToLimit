'use client';

import { motion } from 'framer-motion';
import { FileItem } from '@/types/file';
import { formatSize } from '@/lib/format-size';

interface ResultCardProps {
  items: FileItem[];
  onDownloadAll: () => void;
  onRecompressAll: () => void;
}

export function ResultCard({ items, onDownloadAll, onRecompressAll }: ResultCardProps) {
  const doneItems = items.filter((i) => i.status === 'done' && i.result);
  if (doneItems.length === 0) return null;

  const totalOriginal = doneItems.reduce((s, i) => s + (i.result?.originalSize ?? 0), 0);
  const totalCompressed = doneItems.reduce((s, i) => s + (i.result?.compressedSize ?? 0), 0);
  const avgReduction = ((1 - totalCompressed / totalOriginal) * 100);
  const allWithinTarget = doneItems.every((i) => i.result?.isWithinTarget);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      {/* Status badge */}
      <div className="mb-5">
        {allWithinTarget ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
            ✅ All files ready for upload
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-4 py-2 text-sm font-semibold text-yellow-700">
            ⚠ Some files slightly above target
          </span>
        )}
      </div>

      {/* Aggregate stats */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        {[
          { label: 'Total Original', value: formatSize(totalOriginal), color: 'text-slate-700' },
          { label: 'Total Compressed', value: formatSize(totalCompressed), color: 'text-green-600' },
          { label: 'Avg Reduction', value: `−${avgReduction.toFixed(1)}%`, color: 'text-blue-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-center">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
            <div className={`font-mono text-lg font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Total reduction bar */}
      <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="mb-2 flex justify-between text-[11px] font-semibold text-slate-400">
          <span>Total size reduction</span>
          <span>{formatSize(totalOriginal)} → {formatSize(totalCompressed)}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400"
            initial={{ width: '100%' }}
            animate={{ width: `${100 - avgReduction}%` }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          />
        </div>
      </div>

      {/* Per-file summary rows */}
      <div className="mb-5 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
          {doneItems.length} compressed file{doneItems.length !== 1 ? 's' : ''}
        </p>
        {doneItems.map((item) => {
          const r = item.result!;
          return (
            <div key={item.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              {r.previewUrl ? (
                <img src={r.previewUrl} alt="" className="h-10 w-10 shrink-0 rounded-md border border-slate-200 object-cover" />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-red-50 text-lg">📄</div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold text-slate-700">{r.fileName}</p>
                <p className="font-mono text-[11px] text-slate-400">
                  {formatSize(r.originalSize)} → <span className="text-green-600 font-bold">{formatSize(r.compressedSize)}</span>
                  <span className="ml-1.5 text-blue-500">−{r.reductionPercent.toFixed(1)}%</span>
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                r.isWithinTarget ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {r.isWithinTarget ? '✅' : '⚠'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onDownloadAll}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-[14px] font-bold text-white transition hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-lg"
        >
          ⬇ Download All as ZIP
        </button>
        <button
          type="button"
          onClick={onRecompressAll}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-[14px] font-semibold text-slate-600 transition hover:border-blue-400 hover:text-blue-600"
        >
          🔄 Re-compress
        </button>
      </div>
    </motion.div>
  );
}
