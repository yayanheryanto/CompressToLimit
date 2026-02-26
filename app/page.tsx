'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { UploadZone } from '@/components/upload-zone';
import { FileCard } from '@/components/file-card';
import { CompressionForm } from '@/components/compression-form';
import { ResultCard } from '@/components/result-card';
import { compressImage } from '@/lib/compress-image';
import { compressPDF } from '@/lib/compress-pdf';
import { mbToBytes } from '@/lib/format-size';
import { useAnalytics } from '@/hooks/use-analytics';
import type {
  FileItem,
  UploadedFile,
  CompressionResult,
  ProgressState,
} from '@/types/file';

const INITIAL_PROGRESS: ProgressState = { percent: 0, label: 'Compressing…', step: 'Initializing…' };

function nanoid() {
  return Math.random().toString(36).slice(2, 10);
}

function StepIndicator({ active }: { active: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: 'Upload' },
    { n: 2, label: 'Configure' },
    { n: 3, label: 'Download' },
  ] as const;

  return (
    <div className="mb-10 flex items-center justify-center gap-1">
      {steps.map(({ n, label }, i) => {
        const isDone = n < active;
        const isActive = n === active;
        return (
          <div key={n} className="flex items-center gap-1">
            <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition ${isDone ? 'text-green-600' : isActive ? 'text-blue-600' : 'text-slate-400'}`}>
              <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-[11px] transition ${isDone ? 'border-green-500 bg-green-500 text-white' : isActive ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 text-slate-400'}`}>
                {isDone ? '✓' : n}
              </div>
              {label}
            </div>
            {i < steps.length - 1 && (
              <div className={`mx-2 h-0.5 w-8 rounded-full transition ${n < active ? 'bg-green-400' : 'bg-slate-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function HomePage() {
  const [items, setItems] = useState<FileItem[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const track = useAnalytics();

  const previewUrlsRef = useRef<Map<string, string>>(new Map());

  const hasFiles = items.length > 0;
  const doneCount = items.filter((i) => i.status === 'done').length;
  const activeStep: 1 | 2 | 3 = !hasFiles ? 1 : doneCount === items.length && items.length > 0 ? 3 : 2;

  // ─── Add files ───────────────────────────────────────────────────────────────
  const handleFilesSelected = useCallback((files: UploadedFile[]) => {
    const newItems: FileItem[] = files.map((f) => ({
      id: nanoid(),
      uploadedFile: f,
      status: 'idle',
      progress: INITIAL_PROGRESS,
    }));
    setItems((prev) => [...prev, ...newItems]);
    files.forEach((f) => {
      track.fileUploaded({ file_type: f.mimeType, file_size_kb: f.file.size / 1024 });
    });
  }, [track]);

  // ─── Remove one file ─────────────────────────────────────────────────────────
  const handleRemove = useCallback((id: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item?.uploadedFile.previewUrl) URL.revokeObjectURL(item.uploadedFile.previewUrl);
      const prev2 = previewUrlsRef.current.get(id);
      if (prev2) { URL.revokeObjectURL(prev2); previewUrlsRef.current.delete(id); }
      return prev.filter((i) => i.id !== id);
    });
    track.fileRemoved();
  }, [track]);

  // ─── Clear all ───────────────────────────────────────────────────────────────
  const handleClearAll = useCallback(() => {
    items.forEach((item) => {
      if (item.uploadedFile.previewUrl) URL.revokeObjectURL(item.uploadedFile.previewUrl);
      const prev = previewUrlsRef.current.get(item.id);
      if (prev) URL.revokeObjectURL(prev);
    });
    previewUrlsRef.current.clear();
    setItems([]);
  }, [items]);

  // ─── Update single item in state ─────────────────────────────────────────────
  const updateItem = useCallback((id: string, patch: Partial<FileItem>) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, ...patch } : i));
  }, []);

  // ─── Compress all pending files sequentially ─────────────────────────────────
  const handleCompress = useCallback(async (targetMB: number) => {
    const pending = items.filter((i) => i.status === 'idle' || i.status === 'error');
    if (pending.length === 0) return;

    setIsCompressing(true);
    const targetBytes = mbToBytes(targetMB);

    for (const item of pending) {
      const { id, uploadedFile: f } = item;
      const originalKB = f.file.size / 1024;
      const targetKB = targetBytes / 1024;

      updateItem(id, { status: 'compressing', progress: INITIAL_PROGRESS, errorMessage: undefined });

      track.compressStarted({
        file_type: f.mimeType,
        original_size_kb: originalKB,
        target_size_kb: targetKB,
        reduction_target_pct: (1 - targetKB / originalKB) * 100,
      });

      const onProgress = (percent: number, step: string) => {
        updateItem(id, { progress: { percent, label: 'Compressing…', step } });
      };

      try {
        let blob: Blob;
        let wasAboveTarget = false;

        if (f.mimeType.startsWith('image/')) {
          blob = await compressImage(f.file, targetBytes, onProgress);
        } else {
          const pdfResult = await compressPDF(f.file, targetBytes, onProgress);
          blob = pdfResult.blob;
          wasAboveTarget = pdfResult.wasAboveTarget;
          if (wasAboveTarget) {
            toast.warning(`"${f.name}" — PDF compressed best-effort, still above target.`, { duration: 5000 });
          }
        }

        // Build result preview URL
        let previewUrl: string | undefined;
        if (blob.type.startsWith('image/')) {
          const old = previewUrlsRef.current.get(id);
          if (old) URL.revokeObjectURL(old);
          previewUrl = URL.createObjectURL(blob);
          previewUrlsRef.current.set(id, previewUrl);
        }

        const ext = f.name.split('.').pop() ?? 'jpg';
        const baseName = f.name.replace(/\.[^.]+$/, '');
        const outputExt = blob.type === 'image/jpeg' ? 'jpg' : ext;
        const reductionPercent = (1 - blob.size / f.file.size) * 100;
        const withinTarget = blob.size <= targetBytes || !wasAboveTarget;

        const result: CompressionResult = {
          blob,
          originalSize: f.file.size,
          compressedSize: blob.size,
          reductionPercent,
          isWithinTarget: withinTarget,
          previewUrl,
          fileName: `${baseName}_compressed.${outputExt}`,
        };

        updateItem(id, { status: 'done', result, progress: { percent: 100, label: 'Done!', step: 'Compression complete.' } });

        track.compressSuccess({
          file_type: f.mimeType,
          original_size_kb: originalKB,
          compressed_size_kb: blob.size / 1024,
          reduction_pct: reductionPercent,
          within_target: withinTarget,
        });

      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Compression failed.';
        updateItem(id, { status: 'error', errorMessage: msg });
        track.compressError({ file_type: f.mimeType, error_message: msg });
        toast.error(`"${f.name}" — ${msg}`);
      }
    }

    setIsCompressing(false);
    const finished = items.filter((i) => i.status === 'done').length + pending.filter((i) => i.status !== 'error').length;
    if (finished > 0) toast.success(`${pending.length} file(s) compressed!`);
  }, [items, updateItem, track]);

  // ─── Download single file ─────────────────────────────────────────────────────
  const handleDownload = useCallback((id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item?.result) return;
    const { result } = item;
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);

    track.fileDownloaded({
      file_type: result.blob.type as 'image/jpeg' | 'image/png' | 'application/pdf',
      compressed_size_kb: result.compressedSize / 1024,
      reduction_pct: result.reductionPercent,
    });
  }, [items, track]);

  // ─── Download all as ZIP ──────────────────────────────────────────────────────
  const handleDownloadAll = useCallback(async () => {
    const doneItems = items.filter((i) => i.status === 'done' && i.result);
    if (doneItems.length === 0) return;

    if (doneItems.length === 1) {
      handleDownload(doneItems[0].id);
      return;
    }

    toast.info('Preparing ZIP…');

    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();

      for (const item of doneItems) {
        const r = item.result!;
        zip.file(r.fileName, r.blob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'compressed-files.zip';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast.success(`Downloaded ${doneItems.length} files as ZIP!`);
    } catch {
      // Fallback: download individually
      toast.warning('ZIP unavailable, downloading files individually…');
      for (const item of doneItems) handleDownload(item.id);
    }
  }, [items, handleDownload]);

  // ─── Re-compress all (reset done/error → idle) ────────────────────────────────
  const handleRecompressAll = useCallback(() => {
    setItems((prev) =>
      prev.map((i) =>
        i.status === 'done' || i.status === 'error'
          ? { ...i, status: 'idle', result: undefined, errorMessage: undefined, progress: INITIAL_PROGRESS }
          : i
      )
    );
    track.recompressClicked();
  }, [track]);

  const showResults = doneCount > 0 && !isCompressing;

  return (
    <main className="min-h-screen px-4 pb-24 pt-12">
      <div className="mx-auto max-w-[900px]">

        {/* Header */}
        <motion.header
          className="mb-10 text-center"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-blue-600">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-600" />
            Client-Side Only · No Upload to Server
          </div>
          <h1 className="mb-3 text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl">
            Compress<span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">ToLimit</span>
          </h1>
          <p className="text-base text-slate-500">Compress files exactly to your upload limit.</p>
        </motion.header>

        {/* Steps */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <StepIndicator active={activeStep} />
        </motion.div>

        {/* Upload card */}
        <motion.section
          className="mb-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-xs">📂</div>
            <span className="text-[12px] font-bold uppercase tracking-widest text-slate-400">Upload Files</span>
          </div>

          <UploadZone onFilesSelected={handleFilesSelected} currentCount={items.length} />

          {/* File list */}
          <AnimatePresence mode="popLayout">
            {items.length > 0 && (
              <motion.div
                key="file-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 space-y-2"
              >
                {items.map((item) => (
                  <FileCard
                    key={item.id}
                    item={item}
                    targetMB={null}
                    onRemove={handleRemove}
                    onDownload={handleDownload}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* Config card */}
        <AnimatePresence>
          {hasFiles && (
            <motion.section
              key="config"
              className="mb-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <div className="mb-5 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-xs">⚙️</div>
                <span className="text-[12px] font-bold uppercase tracking-widest text-slate-400">Compression Target</span>
              </div>
              <CompressionForm
                items={items}
                isCompressing={isCompressing}
                onCompress={handleCompress}
                onClearAll={handleClearAll}
              />
            </motion.section>
          )}
        </AnimatePresence>

        {/* Result summary card */}
        <AnimatePresence>
          {showResults && (
            <motion.section
              key="result"
              className="mb-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="mb-5 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-green-50 text-xs">✅</div>
                <span className="text-[12px] font-bold uppercase tracking-widest text-slate-400">Results</span>
              </div>
              <ResultCard
                items={items}
                onDownloadAll={handleDownloadAll}
                onRecompressAll={handleRecompressAll}
              />
            </motion.section>
          )}
        </AnimatePresence>

      </div>
    </main>
  );
}
