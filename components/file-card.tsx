'use client';

import { motion } from 'framer-motion';
import { UploadedFile } from '@/types/file';

interface FileCardProps {
  file: UploadedFile;
  onRemove: () => void;
}

export function FileCard({ file, onRemove }: FileCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.35 }}
      className="mt-5 grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
    >
      {/* Preview */}
      {file.previewUrl ? (
        <img
          src={file.previewUrl}
          alt="preview"
          className="h-[72px] w-[72px] shrink-0 rounded-lg border border-slate-200 object-cover"
        />
      ) : (
        <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-red-100 to-red-200 text-3xl">
          📄
        </div>
      )}

      {/* Info */}
      <div className="min-w-0">
        <h4 className="mb-1.5 truncate text-[15px] font-semibold text-slate-800">{file.name}</h4>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-md bg-slate-200 px-2 py-0.5 font-mono text-xs text-slate-600">
            {file.mimeType}
          </span>
          <span className="rounded-md bg-slate-200 px-2 py-0.5 font-mono text-xs text-slate-600">
            {file.sizeFormatted}
          </span>
        </div>
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-red-400 hover:bg-red-50 hover:text-red-500"
        title="Remove file"
      >
        ✕
      </button>
    </motion.div>
  );
}
