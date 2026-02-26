'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { FileItem } from '@/types/file';

interface CompressionFormProps {
  items: FileItem[];
  isCompressing: boolean;
  onCompress: (targetMB: number) => void;
  onClearAll: () => void;
}

const schema = z.object({
  targetMB: z
    .number({ invalid_type_error: 'Please enter a number.' })
    .min(0.1, 'Minimum is 0.1 MB.'),
});

type FormValues = { targetMB: number };

export function CompressionForm({
  items,
  isCompressing,
  onCompress,
  onClearAll,
}: CompressionFormProps) {
  const idleCount = items.filter((i) => i.status === 'idle').length;
  const doneCount = items.filter((i) => i.status === 'done').length;
  const errorCount = items.filter((i) => i.status === 'error').length;
  const compressingCount = items.filter((i) => i.status === 'compressing').length;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { targetMB: 2 },
  });

  const targetMB = watch('targetMB');
  const onSubmit = (data: FormValues) => onCompress(data.targetMB);

  const canCompress = idleCount > 0 && !isCompressing;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Summary chips */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-semibold text-slate-600">{items.length} file{items.length !== 1 ? 's' : ''}</span>
        {idleCount > 0 && (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
            {idleCount} pending
          </span>
        )}
        {compressingCount > 0 && (
          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-bold text-blue-600">
            {compressingCount} compressing
          </span>
        )}
        {doneCount > 0 && (
          <span className="rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-bold text-green-600">
            {doneCount} done
          </span>
        )}
        {errorCount > 0 && (
          <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-bold text-red-500">
            {errorCount} error
          </span>
        )}
        <button
          type="button"
          onClick={onClearAll}
          disabled={isCompressing}
          className="ml-auto text-[11px] font-semibold text-slate-400 transition hover:text-red-500 disabled:opacity-40"
        >
          Clear all
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Target size */}
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-slate-500">
              Target Size <span className="font-normal text-slate-400">(applied to all files)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0.1"
                placeholder="e.g. 2.0"
                disabled={isCompressing}
                {...register('targetMB', { valueAsNumber: true })}
                className={[
                  'w-full rounded-lg border py-3 pl-4 pr-14 font-mono text-[15px] font-medium text-slate-800 outline-none transition focus:ring-2 disabled:opacity-50',
                  errors.targetMB
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100',
                ].join(' ')}
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                MB
              </span>
            </div>
            {errors.targetMB ? (
              <p className="text-xs text-red-500">{errors.targetMB.message}</p>
            ) : (
              <p className="text-xs text-slate-400">
                Each file will be compressed to ≤ {targetMB || '?'} MB
              </p>
            )}
          </div>

          {/* Strategy */}
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-slate-500">Strategy</label>
            <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] text-slate-500 leading-relaxed">
              <span>🔀 Files compressed sequentially</span>
              <span>🔍 Binary search quality (14 iters)</span>
              <span>📐 Aspect ratio preserved</span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={!canCompress}
          className="mt-5 flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 py-3.5 text-[15px] font-bold text-white transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/25 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCompressing ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Compressing {compressingCount > 0 ? `file ${doneCount + errorCount + 1} of ${items.length}` : '…'}
            </>
          ) : (
            <>
              ⚡ Compress {idleCount > 0 ? `${idleCount} File${idleCount !== 1 ? 's' : ''}` : 'All'}
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
}
