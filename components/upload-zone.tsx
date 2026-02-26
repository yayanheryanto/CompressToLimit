'use client';

import { useRef, useState, useCallback, DragEvent, ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { UploadedFile, SupportedMimeType } from '@/types/file';
import { formatSize, bytesToMB } from '@/lib/format-size';

const ALLOWED_TYPES: SupportedMimeType[] = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_BYTES = 50 * 1024 * 1024;
const MAX_FILES = 20;

interface UploadZoneProps {
  onFilesSelected: (files: UploadedFile[]) => void;
  currentCount: number;
}

export function UploadZone({ onFilesSelected, currentCount }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const processFiles = useCallback(
    (rawFiles: FileList | File[]) => {
      const files = Array.from(rawFiles);
      const remaining = MAX_FILES - currentCount;

      if (remaining <= 0) {
        toast.error(`Maximum ${MAX_FILES} files allowed.`);
        return;
      }

      const accepted: UploadedFile[] = [];
      let skipped = 0;

      for (const file of files.slice(0, remaining)) {
        if (!ALLOWED_TYPES.includes(file.type as SupportedMimeType)) {
          toast.error(`"${file.name}" — unsupported type. Only JPG, PNG, PDF.`);
          skipped++;
          continue;
        }
        if (file.size > MAX_BYTES) {
          toast.error(`"${file.name}" — exceeds 50 MB limit.`);
          skipped++;
          continue;
        }
        accepted.push({
          file,
          name: file.name,
          mimeType: file.type as SupportedMimeType,
          sizeMB: bytesToMB(file.size),
          sizeFormatted: formatSize(file.size),
          previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        });
      }

      if (files.length > remaining) {
        toast.warning(`Only ${remaining} more file(s) accepted (max ${MAX_FILES}).`);
      }

      if (accepted.length > 0) {
        onFilesSelected(accepted);
      }
    },
    [onFilesSelected, currentCount]
  );

  const onDragOver = (e: DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
  };
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={[
        'relative cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-all duration-200',
        dragging
          ? 'scale-[1.01] border-blue-500 bg-blue-50'
          : 'border-slate-200 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/40',
      ].join(' ')}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        multiple
        className="hidden"
        onChange={onChange}
      />

      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-violet-100 text-2xl">
        📁
      </div>
      <h3 className="mb-1 text-base font-semibold text-slate-800">Drop files here</h3>
      <p className="mb-5 text-sm text-slate-400">
        Multiple files supported · up to {MAX_FILES} files
      </p>

      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md"
        onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
      >
        ↑ Choose Files
      </button>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {(['JPG', 'PNG', 'PDF'] as const).map((t) => (
          <span
            key={t}
            className={[
              'rounded-full px-3 py-1 font-mono text-[11px] font-semibold',
              t === 'JPG' ? 'bg-yellow-100 text-yellow-800' :
              t === 'PNG' ? 'bg-green-100 text-green-800' :
              'bg-red-100 text-red-800',
            ].join(' ')}
          >
            {t}
          </span>
        ))}
        <span className="self-center text-[11px] text-slate-400">· Max 50 MB each</span>
      </div>
    </motion.div>
  );
}
