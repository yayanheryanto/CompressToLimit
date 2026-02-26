'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { ProgressBar } from './progress-bar';
import { ProgressState } from '@/types/file';
import { formatSize } from '@/lib/format-size';

interface CompressionFormProps {
  originalSizeBytes: number;
  isCompressing: boolean;
  progress: ProgressState;
  onCompress: (targetMB: number) => void;
}

function buildSchema(maxMB: number) {
  return z.object({
    targetMB: z
      .number({ invalid_type_error: 'Please enter a number.' })
      .min(0.1, 'Minimum target is 0.1 MB.')
      .max(maxMB, `Must be less than ${maxMB.toFixed(2)} MB (original size).`),
  });
}

type FormValues = { targetMB: number };

export function CompressionForm({
  originalSizeBytes,
  isCompressing,
  progress,
  onCompress,
}: CompressionFormProps) {
  const maxMB = parseFloat((originalSizeBytes / (1024 * 1024) - 0.1).toFixed(2));

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(buildSchema(maxMB)),
  });

  const onSubmit = (data: FormValues) => onCompress(data.targetMB);

  return (
    <motion.form
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Target size */}
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-semibold text-slate-500">Target Size</label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              min="0.1"
              max={maxMB}
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
              Original: {formatSize(originalSizeBytes)} · Max: {maxMB} MB
            </p>
          )}
        </div>

        {/* Strategy info */}
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-semibold text-slate-500">Quality Strategy</label>
          <div className="flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] text-slate-500 leading-relaxed">
            <span>🔍 Binary search quality (14 iters)</span>
            <span>📐 Aspect ratio preserved</span>
            <span>🗜 Iterative re-encode</span>
          </div>
        </div>
      </div>

      {/* Progress */}
      <AnimatePresence>
        {isCompressing && (
          <motion.div className="mt-5">
            <ProgressBar progress={progress} />
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="submit"
        disabled={isCompressing}
        className="mt-5 flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 py-3.5 text-[15px] font-bold text-white transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/25 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isCompressing ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Compressing…
          </>
        ) : (
          '⚡ Compress Now'
        )}
      </button>
    </motion.form>
  );
}
