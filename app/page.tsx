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
import type { UploadedFile, CompressionResult, CompressionStatus, ProgressState } from '@/types/file';

const INITIAL_PROGRESS: ProgressState = { percent: 0, label: 'Compressing…', step: 'Initializing…' };

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
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [status, setStatus] = useState<CompressionStatus>('idle');
  const [progress, setProgress] = useState<ProgressState>(INITIAL_PROGRESS);

  const resultPreviewRef = useRef<string | null>(null);
  const track = useAnalytics(); // fires page_view on mount

  const activeStep: 1 | 2 | 3 = !uploadedFile ? 1 : result ? 3 : 2;

  const handleFileSelected = useCallback((file: UploadedFile) => {
    setUploadedFile(file);
    setResult(null);
    setStatus('idle');

    track.fileUploaded({
      file_type: file.mimeType,
      file_size_kb: file.file.size / 1024,
    });
  }, [track]);

  const handleRemove = useCallback(() => {
    if (uploadedFile?.previewUrl) URL.revokeObjectURL(uploadedFile.previewUrl);
    if (resultPreviewRef.current) URL.revokeObjectURL(resultPreviewRef.current);
    setUploadedFile(null);
    setResult(null);
    setStatus('idle');
    setProgress(INITIAL_PROGRESS);
    track.fileRemoved();
  }, [uploadedFile, track]);

  const handleCompress = useCallback(
    async (targetMB: number) => {
      if (!uploadedFile) return;

      setStatus('compressing');
      setResult(null);
      setProgress(INITIAL_PROGRESS);

      const targetBytes = mbToBytes(targetMB);
      const originalKB = uploadedFile.file.size / 1024;
      const targetKB = targetBytes / 1024;

      track.compressStarted({
        file_type: uploadedFile.mimeType,
        original_size_kb: originalKB,
        target_size_kb: targetKB,
        reduction_target_pct: (1 - targetKB / originalKB) * 100,
      });

      const onProgress = (percent: number, step: string) =>
        setProgress({ percent, label: 'Compressing…', step });

      try {
        let blob: Blob;
        let wasAboveTarget = false;

        if (uploadedFile.mimeType.startsWith('image/')) {
          blob = await compressImage(uploadedFile.file, targetBytes, onProgress);
        } else {
          const pdfResult = await compressPDF(uploadedFile.file, targetBytes, onProgress);
          blob = pdfResult.blob;
          wasAboveTarget = pdfResult.wasAboveTarget;
          if (wasAboveTarget) {
            toast.warning('PDF compressed best-effort but still above target. PDF compression is limited.', {
              duration: 6000,
            });
          }
        }

        // Build preview URL for images
        let previewUrl: string | undefined;
        if (blob.type.startsWith('image/')) {
          if (resultPreviewRef.current) URL.revokeObjectURL(resultPreviewRef.current);
          previewUrl = URL.createObjectURL(blob);
          resultPreviewRef.current = previewUrl;
        }

        const ext = uploadedFile.name.split('.').pop() ?? 'jpg';
        const baseName = uploadedFile.name.replace(/\.[^.]+$/, '');
        const outputExt = blob.type === 'image/jpeg' ? 'jpg' : ext;
        const reductionPct = (1 - blob.size / uploadedFile.file.size) * 100;
        const withinTarget = blob.size <= targetBytes || !wasAboveTarget;

        track.compressSuccess({
          file_type: uploadedFile.mimeType,
          original_size_kb: originalKB,
          compressed_size_kb: blob.size / 1024,
          reduction_pct: reductionPct,
          within_target: withinTarget,
        });

        setResult({
          blob,
          originalSize: uploadedFile.file.size,
          compressedSize: blob.size,
          reductionPercent: reductionPct,
          isWithinTarget: withinTarget,
          previewUrl,
          fileName: `${baseName}_compressed.${outputExt}`,
        });

        setStatus('done');
        toast.success('Compression complete!');
      } catch (err) {
        setStatus('error');
        const msg = err instanceof Error ? err.message : 'Compression failed.';

        track.compressError({
          file_type: uploadedFile.mimeType,
          error_message: msg,
        });

        toast.error(msg);
      }
    },
    [uploadedFile, track]
  );

  const handleDownload = useCallback(() => {
    if (!result) return;
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

    toast.success('Download started!');
  }, [result, track]);

  const handleRecompress = useCallback(() => {
    setResult(null);
    setStatus('idle');
    setProgress(INITIAL_PROGRESS);
    track.recompressClicked();
  }, [track]);

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
            <span className="text-[12px] font-bold uppercase tracking-widest text-slate-400">Upload File</span>
          </div>

          <UploadZone onFileSelected={handleFileSelected} />

          <AnimatePresence>
            {uploadedFile && (
              <FileCard file={uploadedFile} onRemove={handleRemove} />
            )}
          </AnimatePresence>
        </motion.section>

        {/* Config card */}
        <AnimatePresence>
          {uploadedFile && (
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
                originalSizeBytes={uploadedFile.file.size}
                isCompressing={status === 'compressing'}
                progress={progress}
                onCompress={handleCompress}
              />
            </motion.section>
          )}
        </AnimatePresence>

        {/* Result card */}
        <AnimatePresence>
          {result && (
            <motion.section
              key="result"
              className="mb-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="mb-5 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-green-50 text-xs">✅</div>
                <span className="text-[12px] font-bold uppercase tracking-widest text-slate-400">Result</span>
              </div>
              <ResultCard
                result={result}
                onDownload={handleDownload}
                onRecompress={handleRecompress}
              />
            </motion.section>
          )}
        </AnimatePresence>

      </div>
    </main>
  );
}
